// src/app/api/admin/kyc/pending/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";
// import { hasPermission } from "@/lib/admin/permissions";
import { getISTDateWithOffset } from "@/lib/getISTDate";
import { decodeId } from "@/lib/admin/encodeId";

export async function GET(request: Request) {
    try {
        const adminAuth = await getAdminFromRequest(request);
        if (!adminAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const whereClause = { status: { in: ["pending", "pending_superadmin"] } };

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
                        // isPhoneVerified: true,
                        // isEmailVerified: true,
                    }
                },
                verifications: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1,
                    include: {

                    }
                }
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const userIds = kycProfiles.map(p => p.userId);

        // Fetch all sessions ordered by latest first
        const sessions = await db.diditSession.findMany({
            where: {
                userId: { in: userIds },
            },
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                userId: true,
                status: true,
                // createdAt: true,
            },
        });

        // Keep only latest session per userId
        const diditSessions = Object.values(
            sessions.reduce<Record<number, typeof sessions[number]>>((acc, session) => {
                // first occurrence is latest because ordered desc
                if (!acc[session.userId]) {
                    acc[session.userId] = session;
                }
                return acc;
            }, {})
        );

        const digilockerDocs = await db.verificationDocument.findMany({
            where: { userId: { in: userIds }, verificationType: "digilocker" },
            orderBy: { createdAt: 'desc' },
            select: { id: true, userId: true, verificationStatus: true },
        });

        const latestDigilockerByUser = Object.values(
            digilockerDocs.reduce<Record<number, typeof digilockerDocs[number]>>((acc, doc) => {
                if (!acc[doc.userId]) acc[doc.userId] = doc;
                return acc;
            }, {})
        );
        // console.log("diditSessions", diditSessions);
        // console.log("kycProfiles", kycProfiles);
        // console.log(kycProfiles.user?.email);
        // console.log(kycProfiles[1].user);
        // debugger;
        // Transform data for frontend
        // const formattedRecords = kycProfiles.map((profile) => {
        //     // Determine document type from the most recent verification
        //     const docType = profile.verifications.length > 0 && profile.verifications[0].verificationType
        //         ? profile.verifications[0].verificationType
        //         : "Unknown";

        //     return {
        //         id: profile.id,
        //         userId: profile.userId,
        //         name: `${profile.firstName} ${profile.lastName}`,
        //         email: profile.email,
        //         phone: profile.phone,
        //         // userID1: profile.user.id,

        //         // Profile Data
        //         accountType: profile.accountType || "N/A",
        //         city: profile.city || "N/A",
        //         state: profile.state || "N/A",
        //         postalCode: profile.postalCode || "N/A",
        //         streetAddress: profile.streetAddress || "N/A",
        //         companyName: profile.companyName || null,
        //         businessType: profile.businessType || null,
        //         gstVerified: profile.gstVerified || false,
        //         cinVerified: profile.cinVerified || false,
        //         aadharVerified: profile.aadharVerified || false,
        //         creationDate: profile.createdAt ? profile.createdAt.toISOString().split('T')[0] : "N/A",

        //         documentType: docType,
        //         status: profile.status,
        //         submittedAt: profile.createdAt.toISOString().replace("T", " ").substring(0, 16),

        //         approvedAt: profile.approvedAt ? profile.approvedAt.toISOString() : null,
        //         approvedBy: profile.approvedBy,
        //         rejectedAt: profile.rejectedAt ? profile.rejectedAt.toISOString() : null,
        //         rejectedBy: profile.rejectedBy,
        //         rejectReason: profile.rejectReason,

        //         avatar: `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase(),
        //     };
        // });
        const formattedRecords = kycProfiles.map((profile) => {
            // const docType =
            //     profile.verifications.length > 0 &&
            //         profile.verifications[0].verificationType
            //         ? profile.verifications[0].verificationType
            //         : "Unknown";

            return {
                id: profile.id,
                // userId: profile.userId,

                // Account Info
                accountType: profile.accountType || "N/A",

                // Name Split
                firstName: profile.user?.firstName || "",
                lastName: profile.user?.lastName || "",

                // Contact
                email: profile.user?.email,
                phone: profile.user?.phone,
                // country: profile.country || "India",

                countryCode: profile.user?.countryCode || "",

                // Business Info
                // companyName: profile.companyName || null,
                // businessType: profile.businessType || null,

                // Verification Status
                // gstVerified: profile.gstVerified || false,
                // cinVerified: profile.cinVerified || false,
                // aadharVerified: profile.aadharVerified || false,
                // panVerified: profile.panVerified || false,

                // Dates
                createdAt: profile.createdAt
                    ? profile.createdAt.toISOString()
                    : null,

                // updatedAt: profile.updatedAt
                //     ? profile.updatedAt.toISOString()
                //     : null,

                // Address
                // city: profile.city || "N/A",
                // postalCode: profile.postalCode || "N/A",
                // state: profile.state || "N/A",
                // streetAddress: profile.streetAddress || "N/A",

                // Status
                // status: profile.status,
                // status: diditSessions.find((session) => session.userId === profile.userId)?.status,
                status: (() => {
                    const s = latestDigilockerByUser.find((doc) => doc.userId === profile.userId)?.verificationStatus
                        ?? diditSessions.find((session) => session.userId === profile.userId)?.status
                        ?? null;
                    if (!s) return null;
                    return s.charAt(0).toUpperCase() + s.slice(1);
                })(),

                // Approval / Rejection
                approvedAt: profile.approvedAt
                    ? profile.approvedAt.toISOString()
                    : null,

                approvedBy: profile.approvedBy || null,

                rejectReason: profile.rejectReason || null,

                rejectedAt: profile.rejectedAt
                    ? profile.rejectedAt.toISOString()
                    : null,

                rejectedBy: profile.rejectedBy || null,

                // Documents
                // cinNumber: profile.cinNumber || null,
                // gstNumber: profile.gstNumber || null,
                // panNumber: profile.panNumber || null,

                // Currency / Address Type
                // currency: profile.currency || "INR",
                // addressType: profile.addressType || null,

                internationalVerified:
                    profile.internationalVerified || false,

                // representativeName:
                //     profile.representativeName || null,

                // Extra Frontend Fields
                // documentType: docType,

                submittedAt: profile.createdAt
                    .toISOString()
                    .replace("T", " ")
                    .substring(0, 16),

                avatar: `${profile.firstName?.charAt(0) || ""}${profile.lastName?.charAt(0) || ""
                    }`.toUpperCase(),
            };
        });

        // console.log(formattedRecords);
        // debugger;

        return NextResponse.json({
            success: true,
            data: formattedRecords,
            total: formattedRecords.length,
        });
    } catch (error) {
        console.error("Error fetching KYC records:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch KYC records" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        const adminAuth = await getAdminFromRequest(request);
        if (!adminAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const adminName = `${adminAuth.first_name} ${adminAuth.last_name}`.trim() || "Admin";

        const body = await request.json();
        const { id, action, reason } = body;

        let numericId = Number(id);

        if (isNaN(numericId)) {
            numericId = decodeId(id);
        }

        if (action === "approve") {
            const profile = await db.kycProfile.findUnique({
                where: { id: numericId },
                select: { userId: true }
            });

            if (profile) {
                const session = await db.diditSession.findFirst({
                    where: { userId: profile.userId },
                    orderBy: { createdAt: 'desc' }
                });

                if (session && session.status === "In Review") {
                    const { updateDiditSessionStatus } = await import("@/lib/didit");
                    await updateDiditSessionStatus(session.sessionId, "Approved");

                    await db.diditSession.update({
                        where: { id: session.id },
                        data: { status: "Approved" }
                    });
                }
            }

            await db.kycProfile.update({
                where: { id: numericId },
                data: {
                    status: "approved",
                    approvedBy: adminName,
                    approvedAt: getISTDateWithOffset(0),
                },
            });
        } else if (action === "send_approval") {
            const updatedProfile = await db.kycProfile.update({
                where: { id: numericId },
                data: {
                    status: "pending_superadmin",
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
                            countryCode: true,
                        }
                    }
                }
            });

            const adminRole = await db.adminRole.findUnique({
                where: { id: adminAuth.role },
                select: { name: true },
            });
            const adminRoleName = adminRole?.name ?? "Admin";

            import("@/lib/slack/admin/kyc/send_approval/sendSlackNotification").then(({ sendSlackNotification }) => {
                sendSlackNotification({
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
                }, "KYC In Review - Awaiting Admin Approval");
            }).catch(err => console.error("Slack notification failed:", err));
        } else if (action === "reject") {
            const result = await db.$transaction(async (tx) => {
                const kycProfile = await tx.kycProfile.findUnique({
                    where: { id: numericId },
                    // select: { userId: true },
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
                            select: { countryCode: true },
                        },
                    },
                });

                if (!kycProfile) {
                    throw new Error("KYC Profile not found");
                }
                const rejectedProfile = await tx.kycProfile.update({
                    where: { id: numericId },
                    data: {
                        status: "rejected",
                        rejectedBy: adminName,
                        rejectedAt: new Date(),
                        rejectReason: reason,
                        gstVerified: false,
                        cinVerified: false,
                        aadharVerified: false,
                    },
                });

                const formattedData: Record<string, any> = Object.fromEntries(
                    Object.entries(rejectedProfile).map(([key, value]) => [
                        key,
                        value ?? "",
                    ])
                );
                // Inject countryCode from user relation into the snapshot
                formattedData.countryCode = kycProfile.user?.countryCode || "";

                const rejection = await tx.kycRejection.create({
                    data: {
                        userId: rejectedProfile.userId,
                        status: "rejected",
                        rawResponse: formattedData,
                    },
                });

                // Update verification documents
                await tx.verificationDocument.updateMany({
                    where: { userId: kycProfile.userId, attemptStatus: "pending" },
                    data: {
                        attemptStatus: "rejected",
                        kycRejectionId: rejection.id,
                    },
                });

                await tx.onboarding.update({
                    where: { userId: kycProfile.userId },
                    data: {
                        status: "rejected",
                    },
                });

                await tx.kycProfile.update({
                    where: { id: numericId },
                    data: {
                        rejectReason: null,
                        // rejectedAt: null,
                        rejectedBy: null,
                    },
                });

                return {
                    rejectedProfile,
                    adminName,
                    reason
                };
            });

            const deviceInfo = parseDeviceInfo(request.headers.get("user-agent") || "unknown");
            logAdminActivity({
                logAction: "KYC_REJECTED",
                logMessage: "KYC rejected successfully",
                userId: result.rejectedProfile.userId,
                username: `${result.rejectedProfile.firstName} ${result.rejectedProfile.lastName}`,
                adminId: adminAuth.id,
                adminName: adminName,
                ipAddress:
                    request.headers.get("x-forwarded-for") ||
                    request.headers.get("x-real-ip") ||
                    "unknown",
                device: parseDeviceInfo(request.headers.get("user-agent") || "unknown").device,
                browser: parseDeviceInfo(request.headers.get("user-agent") || "unknown").browser,
                rawData: {
                    newData: {
                        // id: result.rejectedProfile.id,
                        // userId: result.rejectedProfile.userId,
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
                    oldData: null
                },
                userAgent: request.headers.get("user-agent") || "unknown",
            })

            // Send Slack Notification for Rejection
            if (result) {
                const { rejectedProfile, adminName: rejectedByAdmin, reason: rejectionReason } = result;

                // Fetch user for country code
                const userData = await db.user.findUnique({
                    where: { id: rejectedProfile.userId },
                    select: { countryCode: true }
                });

                // Resolve admin role name dynamically
                const adminRole = await db.adminRole.findUnique({
                    where: { id: adminAuth.role },
                    select: { name: true },
                });
                const adminRoleName = adminRole?.name ?? "Admin";

                import("@/lib/slack/admin/kyc/rejection/sendSlackNotification").then(({ sendSlackNotification }) => {
                    sendSlackNotification({
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
                    }, "KYC Rejected - Incomplete Information");
                }).catch(err => console.error("Slack notification failed:", err));
            }

        } else {
            return NextResponse.json(
                { success: false, error: "Invalid action" },
                { status: 400 }
            );
        }

        const successMessage = action === "approve" ? "KYC approved successfully" : action === "send_approval" ? "KYC sent for approval successfully" : "KYC rejected successfully";

        return NextResponse.json({
            success: true,
            message: successMessage,
        });
    } catch (error) {
        console.error("Error updating KYC record:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update KYC record" },
            { status: 500 }
        );
    }
}
