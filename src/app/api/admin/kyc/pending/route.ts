// src/app/api/admin/kyc/pending/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";
import { getISTDateWithOffset } from "@/lib/getISTDate";
import { decodeId } from "@/lib/admin/encodeId";

export async function GET(request: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(request);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PREPARE KYC FILTERS
        // =============================
        const whereClause = { status: { in: ["pending", "pending_superadmin"] } };

        // =============================
        // STEP 3: FETCH PENDING KYC PROFILES
        // =============================
        const kycProfiles = await db.kycProfile.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        firstName: true,
                        lastName: true,
                        countryCode: true,
                    },
                },
                verifications: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    take: 1,
                    include: {},
                },
            },
            orderBy: {
                createdAt: "desc"
            },
        });

        // =============================
        // STEP 4: EXTRACT USER IDS
        // =============================
        const userIds = kycProfiles.map((profile) => profile.userId);

        // =============================
        // STEP 5: FETCH DIDIT SESSIONS
        // =============================
        const sessions = await db.diditSession.findMany({
            where: { userId: { in: userIds } },
            orderBy: {
                createdAt: "desc"
            },
            select: {
                id: true,
                userId: true,
                status: true,
            },
        });

        // =============================
        // STEP 6: GET LATEST DIDIT SESSION
        // =============================
        const diditSessions = Object.values(
            sessions.reduce<Record<number, typeof sessions[number]>>((acc, session) => {
                if (!acc[session.userId]) { acc[session.userId] = session; }
                return acc;
            }, {})
        );

        // =============================
        // STEP 7: FETCH DIGILOCKER DOCUMENTS
        // =============================
        const digilockerDocs = await db.verificationDocument.findMany({
            where: {
                userId: { in: userIds },
                verificationType: "digilocker",
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                userId: true,
                verificationStatus: true,
            },
        });

        // =============================
        // STEP 8: GET LATEST DIGILOCKER STATUS
        // =============================
        const latestDigilockerByUser = Object.values(
            digilockerDocs.reduce<Record<number, typeof digilockerDocs[number]>>((acc, doc) => {
                if (!acc[doc.userId]) { acc[doc.userId] = doc; }
                return acc;
            }, {})
        );

        // =============================
        // STEP 9: FORMAT KYC RECORDS
        // =============================
        const formattedRecords = kycProfiles.map((profile) => {
            return {
                id: profile.id,
                accountType: profile.accountType || "N/A",

                firstName: profile.user?.firstName || "",
                lastName: profile.user?.lastName || "",

                email: profile.user?.email,
                phone: profile.user?.phone,
                countryCode: profile.user?.countryCode || "",

                createdAt: profile.createdAt ? profile.createdAt.toISOString().replace("T", " ").substring(0, 19) : null,

                status: (() => {
                    const s = latestDigilockerByUser.find((doc) => doc.userId === profile.userId)?.verificationStatus ??
                        diditSessions.find((session) => session.userId === profile.userId)?.status ?? null;
                    if (!s) return null;
                    return s.charAt(0).toUpperCase() + s.slice(1);
                })(),

                approvedAt: profile.approvedAt ? profile.approvedAt.toISOString() : null,

                approvedBy: profile.approvedBy || null,

                rejectReason: profile.rejectReason || null,

                rejectedAt: profile.rejectedAt ? profile.rejectedAt.toISOString() : null,

                rejectedBy: profile.rejectedBy || null,

                internationalVerified: profile.internationalVerified || false,

                submittedAt: profile.createdAt.toISOString().replace("T", " ").substring(0, 19),

                avatar: `${profile.firstName?.charAt(0) || ""}${profile.lastName?.charAt(0) || ""}`.toUpperCase(),
            };
        });

        // =============================
        // STEP 10: RETURN KYC RECORDS
        // =============================
        return NextResponse.json({
            success: true,
            data: formattedRecords,
            total: formattedRecords.length,
        });

    } catch (error) {
        console.error("Error fetching KYC records:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch KYC records" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(request);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PREPARE ADMIN DETAILS
        // =============================
        const adminName = `${adminAuth.first_name} ${adminAuth.last_name}`.trim() || "Admin";

        // =============================
        // STEP 3: PARSE REQUEST DATA
        // =============================
        const body = await request.json();
        const { id, action, reason } = body;

        // =============================
        // STEP 4: DECODE KYC PROFILE ID
        // =============================
        let numericId = Number(id);

        if (isNaN(numericId)) {
            numericId = decodeId(id);
        }

        // =============================
        // STEP 5: HANDLE KYC APPROVAL
        // =============================
        if (action === "approve") {
            const profile = await db.kycProfile.findUnique({
                where: { id: numericId },
                select: {
                    userId: true
                }
            });

            if (profile) {
                const session = await db.diditSession.findFirst({
                    where: { userId: profile.userId, },
                    orderBy: {
                        createdAt: "desc"
                    }
                });

                if (session && session.status === "In Review") {
                    const { updateDiditSessionStatus } = await import("@/lib/didit");
                    await updateDiditSessionStatus(session.sessionId, "Approved");

                    await db.diditSession.update({
                        where: { id: session.id },
                        data: {
                            status: "Approved",
                            updatedAt: getISTDateWithOffset(0),
                        }
                    });
                }
            }

            await db.kycProfile.update({
                where: { id: numericId },
                data: {
                    status: "approved",
                    approvedBy: adminName,
                    approvedAt: getISTDateWithOffset(0),
                    updatedAt: getISTDateWithOffset(0),
                }
            });
        }

        // =============================
        // STEP 6: SEND KYC FOR APPROVAL
        // =============================
        else if (action === "send_approval") {
            const updatedProfile = await db.kycProfile.update({
                where: { id: numericId },
                data: {
                    status: "pending_superadmin",
                    updatedAt: getISTDateWithOffset(0),
                },
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    accountType: true,
                    companyName: true,
                    city: true,
                    country: true,
                    state: true,
                    postalCode: true,
                    streetAddress: true,
                    user: {
                        select: {
                            countryCode: true
                        }
                    }
                }
            });

            const adminRole = await db.adminRole.findUnique({
                where: { id: adminAuth.role },
                select: {
                    name: true
                }
            });

            const adminRoleName = adminRole?.name ?? "Admin";

            import("@/lib/slack/admin/kyc/send_approval/sendSlackNotification")
                .then(({ sendSlackNotification }) => {
                    sendSlackNotification(
                        {
                            firstName: updatedProfile.firstName,
                            lastName: updatedProfile.lastName,
                            email: updatedProfile.email,
                            phone: updatedProfile.phone,
                            countryCode: updatedProfile.user?.countryCode || "",
                            accountType: updatedProfile.accountType,
                            companyName: updatedProfile.companyName || undefined,
                            streetAddress: updatedProfile.streetAddress || undefined,
                            city: updatedProfile.city || undefined,
                            postalCode: updatedProfile.postalCode || undefined,
                            country: updatedProfile.country || undefined,
                            sentBy: `${adminName} (${adminRoleName})`
                        },
                        "KYC In Review - Awaiting Admin Approval"
                    );
                })
                .catch((err) =>
                    console.error("Slack notification failed:", err)
                );
        }

        // =============================
        // STEP 7: HANDLE KYC REJECTION
        // =============================
        else if (action === "reject") {
            const result = await db.$transaction(async (tx) => {
                const kycProfile = await tx.kycProfile.findUnique({
                    where: { id: numericId },
                    select: {
                        id: true,
                        userId: true,
                        accountType: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        country: true,
                        companyName: true,
                        businessType: true,
                        gstVerified: true,
                        cinVerified: true,
                        aadharVerified: true,
                        createdAt: true,
                        updatedAt: true,
                        city: true,
                        postalCode: true,
                        state: true,
                        streetAddress: true,
                        status: true,
                        approvedAt: true,
                        approvedBy: true,
                        rejectReason: true,
                        rejectedAt: true,
                        rejectedBy: true,
                        cinNumber: true,
                        gstNumber: true,
                        panNumber: true,
                        panVerified: true,
                        currency: true,
                        addressType: true,
                        internationalVerified: true,
                        representativeName: true,
                        user: {
                            select: {
                                countryCode: true
                            }
                        }
                    }
                });

                if (!kycProfile) {
                    throw new Error("KYC Profile not found");
                }

                const rejectedProfile = await tx.kycProfile.update({
                    where: { id: numericId },
                    data: {
                        status: "rejected",
                        rejectedBy: adminName,
                        rejectedAt: getISTDateWithOffset(0),
                        rejectReason: reason,
                        gstVerified: false,
                        cinVerified: false,
                        aadharVerified: false
                    }
                });

                const formattedData: Record<string, any> = Object.fromEntries(Object.entries(rejectedProfile).map(([key, value]) => [key, value ?? ""]));

                formattedData.countryCode = kycProfile.user?.countryCode || "";

                const rejection = await tx.kycRejection.create({
                    data: {
                        userId: rejectedProfile.userId,
                        status: "rejected",
                        rawResponse: formattedData,
                        verifiedAt: getISTDateWithOffset(0),
                    }
                });

                await tx.verificationDocument.updateMany({
                    where: { userId: kycProfile.userId, attemptStatus: "pending" },
                    data: {
                        attemptStatus: "rejected",
                        kycRejectionId: rejection.id,
                        updatedAt: getISTDateWithOffset(0),
                    }
                });

                await tx.onboarding.update({
                    where: { userId: kycProfile.userId },
                    data: {
                        status: "rejected",
                        updatedAt: getISTDateWithOffset(0),
                    }
                });

                await tx.kycProfile.update({
                    where: { id: numericId },
                    data: {
                        rejectReason: null,
                        rejectedBy: null,
                        updatedAt: getISTDateWithOffset(0),
                    }
                });

                return {
                    rejectedProfile,
                    adminName,
                    reason
                };
            });

            // =============================
            // STEP 8: LOG REJECTION ACTIVITY
            // =============================
            const deviceInfo = parseDeviceInfo(request.headers.get("user-agent") || "unknown");

            logAdminActivity({
                logAction: "KYC_REJECTED",
                logMessage: "KYC rejected successfully",
                userId: result.rejectedProfile.userId,
                username: `${result.rejectedProfile.firstName} ${result.rejectedProfile.lastName}`,
                adminId: adminAuth.id,
                adminName,
                ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
                device: deviceInfo.device,
                browser: deviceInfo.browser,
                rawData: {
                    newData: {
                        accountType: result.rejectedProfile.accountType,
                        firstName: result.rejectedProfile.firstName,
                        lastName: result.rejectedProfile.lastName,
                        email: result.rejectedProfile.email,
                        phone: result.rejectedProfile.phone,
                        country: result.rejectedProfile.country,
                        companyName: result.rejectedProfile.companyName,
                        businessType: result.rejectedProfile.businessType,
                        gstVerified: result.rejectedProfile.gstVerified,
                        cinVerified: result.rejectedProfile.cinVerified,
                        aadharVerified: result.rejectedProfile.aadharVerified,
                        createdAt: result.rejectedProfile.createdAt,
                        updatedAt: result.rejectedProfile.updatedAt,
                        city: result.rejectedProfile.city,
                        postalCode: result.rejectedProfile.postalCode,
                        state: result.rejectedProfile.state,
                        streetAddress: result.rejectedProfile.streetAddress,
                        status: result.rejectedProfile.status,
                        approvedAt: result.rejectedProfile.approvedAt,
                        approvedBy: result.rejectedProfile.approvedBy,
                        rejectReason: result.rejectedProfile.rejectReason,
                        rejectedAt: result.rejectedProfile.rejectedAt,
                        rejectedBy: result.rejectedProfile.rejectedBy,
                        cinNumber: result.rejectedProfile.cinNumber,
                        gstNumber: result.rejectedProfile.gstNumber,
                        panNumber: result.rejectedProfile.panNumber,
                        panVerified: result.rejectedProfile.panVerified,
                        currency: result.rejectedProfile.currency,
                        addressType: result.rejectedProfile.addressType,
                    },
                    oldData: null,
                },
                userAgent: request.headers.get("user-agent") || "unknown",
            });

            // =============================
            // STEP 9: SEND REJECTION NOTIFICATION
            // =============================
            const { rejectedProfile, adminName: rejectedByAdmin, reason: rejectionReason } = result;

            const userData = await db.user.findUnique({
                where: { id: rejectedProfile.userId },
                select: {
                    countryCode: true,
                },
            });

            const adminRole = await db.adminRole.findUnique({
                where: { id: adminAuth.role },
                select: {
                    name: true
                },
            });

            const adminRoleName = adminRole?.name ?? "Admin";

            import("@/lib/slack/admin/kyc/rejection/sendSlackNotification")
                .then(({ sendSlackNotification }) => {
                    sendSlackNotification(
                        {
                            firstName: rejectedProfile.firstName,
                            lastName: rejectedProfile.lastName,
                            email: rejectedProfile.email,
                            phone: rejectedProfile.phone,
                            countryCode: userData?.countryCode || "",
                            accountType: rejectedProfile.accountType,
                            companyName: rejectedProfile.companyName || undefined,
                            streetAddress: rejectedProfile.streetAddress || undefined,
                            postalCode: rejectedProfile.postalCode || undefined,
                            city: rejectedProfile.city || undefined,
                            country: rejectedProfile.country || undefined,
                            rejectionReason: rejectionReason || "No reason provided",
                            rejectedBy: `${rejectedByAdmin} (${adminRoleName})`,
                        },
                        "KYC Rejected - Incomplete Information"
                    );
                })
                .catch((err) =>
                    console.error("Slack notification failed:", err)
                );
        }

        // =============================
        // STEP 10: VALIDATE ACTION
        // =============================
        else {
            return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
        }

        // =============================
        // STEP 11: PREPARE SUCCESS MESSAGE
        // =============================
        const successMessage = action === "approve" ? "KYC approved successfully" : action === "send_approval" ? "KYC sent for approval successfully" : "KYC rejected successfully";

        // =============================
        // STEP 12: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: successMessage,
        });

    } catch (error) {
        console.error("Error updating KYC record:", error);
        return NextResponse.json({ success: false, error: "Failed to update KYC record" }, { status: 500 });
    }
}
