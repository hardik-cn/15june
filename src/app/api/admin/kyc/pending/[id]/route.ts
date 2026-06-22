// src/app/api/admin/kyc/pending/[id]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDiditSessionData } from "@/lib/didit";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { decodeId } from "@/lib/admin/encodeId";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(request);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: GET AND VALIDATE KYC ID
        // =============================
        const { id: idParam } = await params;

        let numericId = Number(idParam);

        if (isNaN(numericId)) {
            numericId = decodeId(idParam);
        }

        if (!Number.isInteger(numericId) || numericId <= 0) {
            return NextResponse.json({ success: false, error: "Invalid ID: must be a positive integer" }, { status: 400 });
        }

        // =============================
        // STEP 3: FETCH PENDING KYC PROFILE
        // =============================
        const kycProfile = await db.kycProfile.findUnique({
            where: {
                id: numericId,
                status: {
                    in: ["pending", "pending_superadmin"],
                },
            },
            include: {
                user: true,
                verifications: true,
                businessDocuments: true,
            },
        });

        if (!kycProfile) {
            return NextResponse.json({ success: false, error: "KYC pending record not found." }, { status: 404 });
        }

        // =============================
        // STEP 4: FETCH DIDIT VERIFICATION DATA
        // =============================
        let diditSessionData = null;
        let diditDecisionData = null;

        if (kycProfile.internationalVerified === true) {
            diditSessionData = await db.diditSession.findFirst({
                where: { userId: kycProfile.userId },
                orderBy: {
                    createdAt: "desc",
                },
            });

            if (diditSessionData?.sessionId) {
                diditDecisionData = await getDiditSessionData(diditSessionData.sessionId);
            }
        }

        // =============================
        // STEP 5: FETCH VERIFICATION DOCUMENTS
        // =============================
        const { user } = kycProfile;

        const allVerificationDocs = await db.verificationDocument.findMany({
            where: {
                userId: user.id,
                verificationStatus: "success",
                attemptStatus: "pending",
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // =============================
        // STEP 6: KEEP LATEST DOCUMENT PER TYPE
        // =============================
        const latestDocsMap = new Map<string, (typeof allVerificationDocs)[0]>();

        for (const doc of allVerificationDocs) {
            if (doc.verificationType && !latestDocsMap.has(doc.verificationType)) {
                latestDocsMap.set(doc.verificationType, doc);
            }
        }

        const verificationDocs = Array.from(latestDocsMap.values());

        const getDocNumber = (type: string) => verificationDocs.find((v) => v.verificationType === type)?.documentNumber ?? null;

        // =============================
        // STEP 7: FORMAT RESPONSE DATA
        // =============================
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

            createdAt: kycProfile.createdAt?.toISOString().replace("T", " ").substring(0, 19),

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

        // console.log(data.documents?.map(doc => doc.verifiedAt));
        // =============================
        // STEP 8: RETURN KYC DATA
        // =============================
        return NextResponse.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Error fetching KYC details:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error", }, { status: 500 });
    }
}