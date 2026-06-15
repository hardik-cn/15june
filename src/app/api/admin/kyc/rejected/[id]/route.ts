// src/app/api/admin/kyc/rejected/[id]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { getDiditSessionData } from "@/lib/didit";
import { decodeId } from "@/lib/admin/encodeId";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;

        // Authenticate admin
        const adminAuth = await getAdminFromRequest(request);
        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate: ID must be a positive integer
        // const numericId = Number(idParam);
        let numericId = Number(idParam);

        if (isNaN(numericId)) {
            numericId = decodeId(idParam);
        }

        if (!Number.isInteger(numericId) || numericId <= 0) {
            return NextResponse.json(
                { success: false, error: "Invalid ID: must be a positive integer" },
                { status: 400 }
            );
        }

        // Step 1: Find the requested record to get userId
        const primaryRejection = await db.kycRejection.findUnique({
            where: { id: numericId },
            select: { userId: true, reference: true },
        });

        if (!primaryRejection) {
            return NextResponse.json(
                { success: false, error: "KYC rejected record not found." },
                { status: 404 }
            );
        }

        const { userId } = primaryRejection;

        const kycProfile = await db.kycProfile.findUnique({
            where: { userId },
            include: {
                user: true,
                verifications: true,
                businessDocuments: true,
            },
        });
        // Step 2: Fetch user verification flags
        const userVerification = await db.user.findUnique({
            where: { id: userId },
            select: { isEmailVerified: true, isPhoneVerified: true, countryCode: true },
        });

        // Step 3: Fetch all rejection records for this userId (newest first)
        const allRejections = await db.kycRejection.findMany({
            where: { userId },
            orderBy: { verifiedAt: "desc" },
        });

        // Step 4: Fetch verification documents tied to this specific rejection
        const verificationDocs = await db.verificationDocument.findMany({
            where: {
                userId,
                kycRejectionId: numericId,
            },
            orderBy: { createdAt: "desc" },
        });

        const getDocNumber = (type: string) =>
            verificationDocs.find((v) => v.verificationType === type)?.documentNumber ?? null;

        // Step 5: Fetch Didit session data
        let diditSessionData = null;
        let diditDecisionData = null;

        const diditSession = await db.diditSession.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        if (diditSession?.sessionId) {
            diditSessionData = diditSession;
            diditDecisionData = await getDiditSessionData(diditSession.sessionId);
        }

        // Step 6: Resolve rejectedBy admin names in one batch query
        const adminIds = [
            ...new Set(
                allRejections
                    .map((r) => ((r.rawResponse ?? {}) as Record<string, any>).rejectedBy)
                    .filter((v) => v && !isNaN(Number(v)))
                    .map(Number)
            ),
        ];

        const adminMap = new Map<number, string>();
        if (adminIds.length > 0) {
            const admins = await db.superAdmin.findMany({
                where: { id: { in: adminIds } },
                select: { id: true, first_name: true, last_name: true },
            });
            for (const admin of admins) {
                adminMap.set(admin.id, `${admin.first_name} ${admin.last_name}`.trim());
            }
        }

        // Step 7: Build response array — one entry per rejection record
        const rejections = allRejections.map((kycRejection) => {
            const dataResponse = (kycRejection.rawResponse ?? {}) as Record<string, any>;

            const rawRejectedBy = dataResponse.rejectedBy ?? null;
            const rejectedBy: string | null =
                rawRejectedBy && !isNaN(Number(rawRejectedBy))
                    ? (adminMap.get(Number(rawRejectedBy)) ?? rawRejectedBy)
                    : rawRejectedBy;

            return {
                id: String(kycRejection.id),
                userId,
                isPrimary: kycRejection.id === numericId,

                // Personal details from rawResponse snapshot
                firstName: dataResponse.firstName ?? null,
                lastName: dataResponse.lastName ?? null,
                email: dataResponse.email ?? null,
                phone: dataResponse.phone ?? null,
                countryCode: dataResponse.countryCode || userVerification?.countryCode || null,

                // Verification flags — prefer live DB values
                isEmailVerified: userVerification?.isEmailVerified ?? dataResponse.isEmailVerified ?? false,
                isPhoneVerified: userVerification?.isPhoneVerified ?? dataResponse.isPhoneVerified ?? false,

                // Address
                streetAddress: dataResponse.streetAddress ?? null,
                city: dataResponse.city ?? null,
                state: dataResponse.state ?? null,
                postalCode: dataResponse.postalCode ?? null,
                country: dataResponse.country ?? null,
                addressType: dataResponse.addressType ?? null,

                // Business
                accountType: dataResponse.accountType ?? null,
                companyName: dataResponse.companyName ?? null,
                businessType: dataResponse.businessType ?? null,

                // Verification flags
                gstVerified: dataResponse.gstVerified ?? false,
                cinVerified: dataResponse.cinVerified ?? false,
                aadharVerified: dataResponse.aadharVerified ?? false,
                internationalVerified: dataResponse.internationalVerified ?? false,
                representativeName: dataResponse.representativeName ?? null,

                // Document numbers
                gstNumber: dataResponse.gstNumber ?? getDocNumber("gst"),
                cinNumber: getDocNumber("cin"),
                aadharNumber: getDocNumber("aadhaar"),

                documents: verificationDocs,

                // Rejection metadata
                status: kycRejection.status,
                rejectedBy,
                createdAt: dataResponse.createdAt ?? null,
                rejectedAt: dataResponse.rejectedAt ?? kycRejection.verifiedAt.toISOString(),
                rejectionReason: dataResponse.rejectionReason ?? dataResponse.rejectReason ?? null,

                // Didit — only include if international
                diditSession: dataResponse.internationalVerified ? diditSessionData : null,
                diditDecision: dataResponse.internationalVerified ? diditDecisionData : null,

                businessDocuments: kycProfile?.businessDocuments ?? [],
            } as Record<string, any>;
        });

        const data = rejections.find((r) => r.isPrimary) ?? rejections[0];

        return NextResponse.json({
            success: true,
            data,
            allRejections: rejections,
            totalRejections: rejections.length,
        });

    } catch (error) {
        console.error("Error fetching rejected KYC details:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}