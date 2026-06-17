// src/app/api/admin/2fa/setup/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

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
        // STEP 2: GENERATE OR LOAD 2FA SECRET
        // =============================
        let secretBase32 = admin.two_factor_secret;

        if (!secretBase32 || !admin.two_factor_enabled) {
            const secret = new OTPAuth.Secret({ size: 20 });
            secretBase32 = secret.base32;

            await db.superAdmin.update({
                where: { id: admin.id },
                data: { two_factor_secret: secretBase32 },
            });
        }

        // =============================
        // STEP 3: GENERATE TOTP QR CODE
        // =============================
        const totp = new OTPAuth.TOTP({
            issuer: "Cantech",
            label: admin.email,
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secretBase32),
        });

        const otpauthUrl = totp.toString();
        const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);

        // =============================
        // STEP 4: RETURN 2FA SETUP DATA
        // =============================
        return NextResponse.json({
            secret: secretBase32,
            qrCode: qrCodeDataURL,
            otpauthUrl,
            isEnabled: admin.two_factor_enabled,
        });

    } catch (error) {
        console.error("[2FA_SETUP_GET_ERROR]:", error);
        return NextResponse.json({ error: "Failed to initialize 2FA setup" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: VALIDATE REQUEST DATA
        // =============================
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
        }

        if (!admin.two_factor_secret) {
            return NextResponse.json({ error: "2FA is not initialized. Please call GET first to generate a secret." }, { status: 400 });
        }

        // =============================
        // STEP 3: VERIFY TOTP CODE
        // =============================
        const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(admin.two_factor_secret),
            algorithm: "SHA1",
            digits: 6,
            period: 30,
        });

        const delta = totp.validate({ token: code, window: 1 });

        if (delta === null) {
            return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
        }

        // =============================
        // STEP 4: ENABLE TWO-FACTOR AUTHENTICATION
        // =============================
        await db.superAdmin.update({
            where: { id: admin.id },
            data: { two_factor_enabled: true },
        });

        // =============================
        // STEP 5: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({ success: true, message: "2FA has been successfully enabled" });

    } catch (error) {
        console.error("[2FA_SETUP_POST_ERROR]:", error);
        return NextResponse.json({ error: "Failed to verify 2FA code" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: DISABLE TWO-FACTOR AUTHENTICATION
        // =============================
        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                two_factor_enabled: false,
                two_factor_secret: null,
            },
        });

        // =============================
        // STEP 3: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "2FA has been disabled",
        });

    } catch (error) {
        console.error("[2FA_SETUP_DELETE_ERROR]:", error);
        return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
    }
}