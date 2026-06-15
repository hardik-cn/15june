import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function GET(req: Request) {

    try {

        // =====================================
        // AUTHENTICATION
        // =====================================

        const authUser = await getUserFromRequest(req);

        if (!authUser) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // =====================================
        // FETCH USER WITH RELATIONS
        // =====================================

        const user = await db.user.findUnique({
            where: { id: authUser.id },
            include: {
                onboarding: true,
                kycProfile: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const kycProfile = user.kycProfile;

        let panData: any = null;
        let cinData: any = null;
        let gstData: any = null;
        let aadhaarAddressFromDoc: any = null;

        // =====================================
        // VERIFICATION LOOKUPS
        // =====================================

        const aadhaarVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "digilocker",
            },
            orderBy: { createdAt: "desc" },
        });

        // Determine if Aadhaar is verified from either kycProfile OR a successful
        // verificationDocument (covers pre-submission / reload scenarios)
        const isAadhaarVerifiedFromDoc =
            aadhaarVerification?.verificationStatus === "success" &&
            aadhaarVerification?.attemptStatus !== "rejected";
        const isAadhaarVerified = Boolean(kycProfile?.aadharVerified) || isAadhaarVerifiedFromDoc;

        // Extract address from the verificationDocument's Cashfree response
        // when kycProfile doesn't have address data yet (pre-submission)
        if (isAadhaarVerifiedFromDoc && aadhaarVerification?.extractedData) {
            const extracted = aadhaarVerification.extractedData as any;
            const splitAddr = extracted?.split_address;
            if (splitAddr) {
                aadhaarAddressFromDoc = {
                    streetAddress: [
                        splitAddr.house,
                        splitAddr.street,
                        splitAddr.landmark,
                        splitAddr.locality,
                    ].filter(Boolean).join(", "),
                    city: splitAddr.vtc || splitAddr.dist || "",
                    state: splitAddr.state || "",
                    postalCode: splitAddr.pincode || "",
                };
            }
        }

        const panVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "pan",
            },
            orderBy: { createdAt: "desc" },
        });

        const cinVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "cin",
            },
            orderBy: { createdAt: "desc" },
        });

        const gstVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "gst",
            },
            orderBy: { createdAt: "desc" },
        });

        // =====================================
        // PAN DATA
        // =====================================

        if (panVerification?.extractedData) {
            const extracted = panVerification.extractedData as any;

            if (extracted?.valid === true) {
                panData = {
                    panNumber: extracted.pan,
                    name: extracted.registered_name,
                };
            }
        }

        // =====================================
        // CIN DATA
        // =====================================

        if (cinVerification?.extractedData) {
            const extracted = cinVerification.extractedData as any;

            if (extracted?.status === "VALID") {
                cinData = {
                    cinNumber: extracted.cin,
                    companyName: extracted.company_name,
                    incorporationDate: extracted.incorporation_date,
                };
            }
        }

        // =====================================
        // GST DATA
        // =====================================

        if (gstVerification?.extractedData) {
            const extracted = gstVerification.extractedData as any;

            if (extracted?.valid === true) {
                gstData = {
                    gstNumber: extracted.GSTIN,
                    legalName: extracted.legal_name_of_business,
                    tradeName: extracted.trade_name_of_business,
                    splitAddress: extracted.principal_place_split_address,
                };
            }
        }

        // =====================================
        // RESPONSE
        // =====================================

        return NextResponse.json({
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                countryCode: user.countryCode,
                isEmailVerified: user.isEmailVerified === 1,
                isPhoneVerified: user.isPhoneVerified === 1,
            },
            onboarding: {
                uuid: user.onboarding?.uuid,
                status: user.onboarding?.status,
            },
            verifications: {
                aadhaar: isAadhaarVerified,
                pan: Boolean(kycProfile?.panVerified),
                cin: Boolean(kycProfile?.cinVerified),
                gst: Boolean(kycProfile?.gstVerified),
            },
            verificationData: {
                pan: panData,
                cin: cinData,
                gst: gstData,
            },
            kycProfile: kycProfile
                ? {
                    aadharVerified: isAadhaarVerified,
                    streetAddress: kycProfile.streetAddress || aadhaarAddressFromDoc?.streetAddress || "",
                    city: kycProfile.city || aadhaarAddressFromDoc?.city || "",
                    state: kycProfile.state || aadhaarAddressFromDoc?.state || "",
                    postalCode: kycProfile.postalCode || aadhaarAddressFromDoc?.postalCode || "",
                    status: kycProfile.status,
                }
                : isAadhaarVerified
                    ? {
                        aadharVerified: true,
                        streetAddress: aadhaarAddressFromDoc?.streetAddress || "",
                        city: aadhaarAddressFromDoc?.city || "",
                        state: aadhaarAddressFromDoc?.state || "",
                        postalCode: aadhaarAddressFromDoc?.postalCode || "",
                        status: "pending",
                    }
                    : null,
        });

    } catch (error) {

        console.error("Client data fetch error:", error);

        return NextResponse.json(
            { error: "Failed to fetch user data" },
            { status: 500 }
        );

    }

}