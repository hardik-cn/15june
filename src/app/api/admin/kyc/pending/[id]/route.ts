// src/app/api/admin/kyc/pending/[id]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDiditSessionData } from "@/lib/didit";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
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

        const kycProfile = await db.kycProfile.findUnique({
            where: { id: numericId, status: { in: ["pending", "pending_superadmin"] } },
            include: {
                user: true,
                verifications: true,
                businessDocuments: true,
            },
        });

        if (!kycProfile) {
            return NextResponse.json(
                { success: false, error: "KYC pending record not found." },
                { status: 404 }
            );
        }

        let diditSessionData = null;
        let diditDecisionData = null;

        if (kycProfile.internationalVerified === true) {
            diditSessionData = await db.diditSession.findFirst({
                where: { userId: kycProfile.userId },
                orderBy: { createdAt: "desc" },
            });

            if (diditSessionData?.sessionId) {
                diditDecisionData = await getDiditSessionData(diditSessionData.sessionId);
            }
        }

        const { user } = kycProfile;

        // Fetch latest successful + pending verification docs per type
        const allVerificationDocs = await db.verificationDocument.findMany({
            where: {
                userId: user.id,
                verificationStatus: "success",
                attemptStatus: "pending",
            },
            orderBy: { createdAt: "desc" },
        });

        // Keep only the latest doc per verificationType
        const latestDocsMap = new Map<string, typeof allVerificationDocs[0]>();
        for (const doc of allVerificationDocs) {
            if (doc.verificationType && !latestDocsMap.has(doc.verificationType)) {
                latestDocsMap.set(doc.verificationType, doc);
            }
        }
        const verificationDocs = Array.from(latestDocsMap.values());

        const getDocNumber = (type: string) =>
            verificationDocs.find((v) => v.verificationType === type)?.documentNumber ?? null;

        const data = {
            id: idParam,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            countryCode: user.countryCode,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,

            documents: verificationDocs,

            streetAddress: kycProfile.streetAddress,
            city: kycProfile.city,
            state: kycProfile.state,
            postalCode: kycProfile.postalCode,
            country: kycProfile.country,

            addressType: kycProfile.addressType,
            accountType: kycProfile.accountType,
            companyName: kycProfile.companyName,
            businessType: kycProfile.businessType,
            gstNumberDoc: kycProfile.gstNumber,

            gstVerified: kycProfile.gstVerified,
            cinVerified: kycProfile.cinVerified,
            aadharVerified: kycProfile.aadharVerified,

            createdAt: kycProfile.createdAt.toISOString(),
            status: kycProfile.status,
            currency: kycProfile.currency,

            gstNumber: getDocNumber("gst"),
            cinNumber: getDocNumber("cin"),
            aadharNumber: getDocNumber("aadhaar"),

            userId: user.id,

            internationalVerified: kycProfile.internationalVerified,
            representativeName: kycProfile.representativeName,
            diditSession: diditSessionData,
            diditDecision: diditDecisionData,
            businessDocuments: kycProfile.businessDocuments,
        };

        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error("Error fetching KYC details:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}