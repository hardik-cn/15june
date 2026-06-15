// src/app/api/admin/2fa/setup/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

/**
 * GET /api/admin/2fa/setup
 *
 * Called from the dashboard settings page to retrieve (or generate) the admin's
 * 2FA secret and QR code.
 *
 * - If the admin already has a secret AND 2FA is enabled, returns the existing secret.
 * - If 2FA is disabled or no secret exists, generates a fresh secret and saves it
 *   as "pending" (two_factor_enabled stays false until POST verification succeeds).
 */
export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let secretBase32 = admin.two_factor_secret;

        // Generate a new secret only when:
        //   a) no secret exists yet, OR
        //   b) 2FA is currently disabled (allows re-enrollment)
        if (!secretBase32 || !admin.two_factor_enabled) {
            const secret = new OTPAuth.Secret({ size: 20 });
            secretBase32 = secret.base32;

            await db.superAdmin.update({
                where: { id: admin.id },
                data: { two_factor_secret: secretBase32 },
            });
        }

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

        return NextResponse.json({
            secret: secretBase32,
            qrCode: qrCodeDataURL,
            otpauthUrl,
            isEnabled: admin.two_factor_enabled,
        });
    } catch (error) {
        console.error("[2FA_SETUP_GET_ERROR]:", error);
        return NextResponse.json(
            { error: "Failed to initialize 2FA setup" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/2fa/setup
 *
 * Enables 2FA for the currently authenticated admin after they verify a TOTP code.
 * Used from the dashboard settings page, NOT during login.
 *
 * Body: { code: string }
 */
export async function POST(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { code } = await req.json();

        if (!code) {
            return NextResponse.json(
                { error: "Verification code is required" },
                { status: 400 }
            );
        }

        if (!admin.two_factor_secret) {
            return NextResponse.json(
                { error: "2FA is not initialized. Please call GET first to generate a secret." },
                { status: 400 }
            );
        }

        const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(admin.two_factor_secret),
            algorithm: "SHA1",
            digits: 6,
            period: 30,
        });

        const delta = totp.validate({ token: code, window: 1 });

        if (delta === null) {
            return NextResponse.json(
                { error: "Invalid code. Please try again." },
                { status: 400 }
            );
        }

        await db.superAdmin.update({
            where: { id: admin.id },
            data: { two_factor_enabled: true },
        });

        return NextResponse.json({
            success: true,
            message: "2FA has been successfully enabled",
        });
    } catch (error) {
        console.error("[2FA_SETUP_POST_ERROR]:", error);
        return NextResponse.json(
            { error: "Failed to verify 2FA code" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/2fa/setup
 *
 * Disables 2FA and clears the stored secret for the currently authenticated admin.
 */
export async function DELETE(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                two_factor_enabled: false,
                two_factor_secret: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: "2FA has been disabled",
        });
    } catch (error) {
        console.error("[2FA_SETUP_DELETE_ERROR]:", error);
        return NextResponse.json(
            { error: "Failed to disable 2FA" },
            { status: 500 }
        );
    }
}