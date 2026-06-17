// src/app/api/admin/whmcs/create-client/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createWhmcsClient } from "@/lib/whmcs/client/createClient";
import { decrypt } from "@/lib/securePassword";
import { countryNameToISO } from "@/lib/countryCode";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { sendSlackNotification } from "@/lib/slack/admin/kyc/approved/sendSlackNotification";

export async function POST(req: Request) {
    // =============================
    // STEP 1: AUTHENTICATE ADMIN
    // =============================
    const admin = await getAdminFromRequest(req);

    if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // =============================
    // STEP 2: FETCH ADMIN ROLE
    // =============================
    const adminRole = await db.adminRole.findUnique({
        where: { id: admin.role },
        select: {
            name: true,
        },
    });

    const adminRoleName = adminRole?.name ?? "Admin";

    // =============================
    // STEP 3: VALIDATE REQUEST DATA
    // =============================
    const { userId } = await req.json();

    if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // =============================
    // STEP 4: FETCH USER DATA
    // =============================
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            onboarding: true,
            kycProfile: {
                include: {
                    verifications: {
                        where: { verificationType: "gst", verificationStatus: "success" },
                        take: 1,
                    },
                },
            },
        },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { onboarding, kycProfile, isEmailVerified, lockStatus } = user;

    // =============================
    // STEP 5: VALIDATE USER ELIGIBILITY
    // =============================
    if (!onboarding) {
        return NextResponse.json({ error: "Onboarding not found" }, { status: 400 });
    }

    if (user.whmcsClientId || onboarding.whmcsClientId) {
        return NextResponse.json({ error: "WHMCS client already exists" }, { status: 400 });
    }

    if (!isEmailVerified) {
        return NextResponse.json({ error: "Email not verified" }, { status: 400 });
    }

    if (!kycProfile || (!kycProfile.aadharVerified && !kycProfile.internationalVerified)) {
        return NextResponse.json({ error: "KYC incomplete" }, { status: 400 });
    }

    // =============================
    // STEP 6: DECRYPT USER PASSWORD
    // =============================
    let plainPassword;

    try {
        plainPassword = decrypt(lockStatus);
    } catch {
        console.warn("Decryption failed. Generating fallback password.");
        plainPassword = Math.random().toString(36).slice(-10) + "Aa1!";
    }

    // =============================
    // STEP 7: FORMAT CONTACT DATA
    // =============================
    const cleanPhoneVal = (user.phone || "").replace(/[^0-9]/g, "");
    const cleanCodeVal = (user.countryCode || "91").replace("+", "");
    const finalPhone = `+${cleanCodeVal}.${cleanPhoneVal}`;

    let whmcsClientId: number;

    // =============================
    // STEP 8: CREATE WHMCS CLIENT
    // =============================
    try {
        whmcsClientId =
            await createWhmcsClient({
                firstName: kycProfile.firstName,
                lastName: kycProfile.lastName,
                email: kycProfile.email,
                phone: finalPhone,
                country: countryNameToISO(kycProfile.country?.trim().toLowerCase()),
                state: kycProfile.state ?? undefined,
                city: kycProfile.city ?? undefined,
                postcode: kycProfile.postalCode ?? undefined,
                address1: kycProfile.streetAddress ?? undefined,
                companyName: kycProfile.companyName ?? undefined,
                gstNumber: kycProfile.verifications[0]?.documentNumber ?? kycProfile.gstNumber ?? undefined,
                password: plainPassword,
                currency:
                    (function () {
                        const currencyMap: Record<string, number> = { INR: 2, USD: 1 };
                        return currencyMap[kycProfile.currency?.toUpperCase() ?? "INR"] ?? 1;
                    })(),
            });

    } catch (err: any) {
        console.error("WHMCS ERROR:", err.message);

        if (err.message?.includes("already exists")) {
            return NextResponse.json({ error: "A client with this email already exists." }, { status: 400 });
        }

        return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
    }

    // =============================
    // STEP 9: UPDATE ONBOARDING STATUS
    // =============================
    await db.onboarding.update({
        where: { id: onboarding.id },
        data: {
            whmcsClientId,
            status: "completed"
        },
    });

    // =============================
    // STEP 10: UPDATE USER ACCOUNT
    // =============================
    await db.user.update({
        where: { id: user.id },
        data: { whmcsClientId },
    });

    // =============================
    // STEP 11: SEND SLACK NOTIFICATION
    // =============================
    await sendSlackNotification(
        {
            firstName: kycProfile.firstName,
            lastName: kycProfile.lastName,
            email: kycProfile.email,
            phone: kycProfile.phone,
            countryCode: user.countryCode || "",
            accountType: kycProfile.accountType,
            businessType: kycProfile.businessType || null,
            companyName: kycProfile.companyName || "",
            streetAddress: kycProfile.streetAddress || "",
            country: kycProfile.country || "",
            city: kycProfile.city || "",
            postalCode: kycProfile.postalCode || "",
            approvedBy: `${admin.first_name} ${admin.last_name} (${adminRoleName})`.trim(),
        },
        "KYC Approved - Account Verified"
    );

    // =============================
    // STEP 12: RETURN SUCCESS RESPONSE
    // =============================
    return NextResponse.json({ success: true, whmcsClientId });
}

export async function GET(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: RETURN ENDPOINT STATUS
        // =============================
        return NextResponse.json({ message: "WHMCS create client endpoint is active" });

    } catch (error) {
        console.error("WHMCS create client GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}