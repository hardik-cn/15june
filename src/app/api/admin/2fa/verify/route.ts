// src/app/api/admin/2fa/verify/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import * as OTPAuth from "otpauth";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";
import { getISTDateWithOffset } from "@/lib/getISTDate";

function getClientInfo(req: Request) {

    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { device, browser } = parseDeviceInfo(userAgent);

    return { userAgent, ipAddress, device, browser };
}

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: VALIDATE OTP REQUEST
        // =============================

        const { userAgent, ipAddress, device, browser } = getClientInfo(req);

        const { code, tempToken } = await req.json();
        if (!code || code.length !== 6) {
            return NextResponse.json({ success: false, error: "A 6-digit OTP code is required." }, { status: 400 });
        }
        // =============================
        // STEP 2: VALIDATE TEMP SESSION
        // =============================
        if (!tempToken) {
            return NextResponse.json({ success: false, error: "Session expired. Please login again." }, { status: 401 });
        }

        let sessionData: any;
        try {
            sessionData = jwt.verify(tempToken, process.env.ACCESS_TOKEN_SECRET || "default_secret");
        } catch (err) {
            return NextResponse.json({ success: false, error: "Session invalid or expired. Please login again." }, { status: 401 });
        }

        const id = Number(sessionData.id);
        const isFirstTimeSetup = sessionData.isFirstTimeSetup ?? false;
        const tempSecret = sessionData.tempSecret;

        // =============================
        // STEP 3: FETCH ADMIN ACCOUNT
        // =============================
        const admin = await db.superAdmin.findUnique({
            where: { id },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                role: true,
                two_factor_secret: true,
                two_factor_enabled: true,
            },
        });

        if (!admin) {
            return NextResponse.json({ success: false, error: "Admin not found." }, { status: 404 });
        }

        const secretToVerify = isFirstTimeSetup ? tempSecret : admin.two_factor_secret;

        if (!secretToVerify) {
            return NextResponse.json({ success: false, error: "2FA is not configured for this account." }, { status: 400 });
        }

        // =============================
        // STEP 4: VERIFY TOTP CODE
        // =============================
        const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(secretToVerify),
            algorithm: "SHA1",
            digits: 6,
            period: 30,
        });

        const delta = totp.validate({ token: code, window: 1 });

        if (delta === null) {
            return NextResponse.json({ success: false, error: "Invalid or expired code. Please try again." }, { status: 400 });
        }

        // =============================
        // STEP 5: UPDATE ADMIN LOGIN STATE
        // =============================
        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                last_login_at: getISTDateWithOffset(0),
                last_login_ip: ipAddress,
                two_factor_enabled: true,
                two_factor_configured: true,
                ...(isFirstTimeSetup && secretToVerify ? { two_factor_secret: secretToVerify } : {}),
            },
        });

        // =============================
        // STEP 6: CLEAR TEMP SESSION
        // =============================
        // cookieStore.delete("2fa_temp_session");

        // =============================
        // STEP 7: GENERATE AUTH TOKENS
        // =============================
        const accessToken = createAccessToken(admin.id);
        const refreshToken = createRefreshToken(admin.id);
        const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        // =============================
        // STEP 8: CREATE ADMIN SESSION
        // =============================
        await db.adminSession.create({
            data: {
                sessionId: nanoid(),
                adminId: admin.id,
                refreshHash,
                ipAddress,
                userAgent,
                deviceName: device,
                browser,
                createdAt: getISTDateWithOffset(0),
                expiresAt: getISTDateWithOffset(1),
            },
        });

        // =============================
        // STEP 9: SET REFRESH TOKEN COOKIE
        // =============================
        const cookieStore = await cookies();
        cookieStore.set("admin_refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 24 * 60 * 60,
        });

        // =============================
        // STEP 10: LOG LOGIN ACTIVITY
        // =============================
        await logAdminActivity({
            logAction: "LOGIN_SUCCESS",
            logMessage: "logged in successfully",
            adminId: admin.id,
            adminName: `${admin.first_name} ${admin.last_name}`,
            ipAddress,
            userAgent,
            device,
            browser,
        });

        // =============================
        // STEP 11: LOG FIRST-TIME 2FA SETUP
        // =============================
        if (isFirstTimeSetup) {
            await logAdminActivity({
                logAction: "2FA_VERIFIED",
                logMessage: "2FA setup completed successfully",
                adminId: admin.id,
                adminName: `${admin.first_name} ${admin.last_name}`,
                ipAddress,
                userAgent,
                device,
                browser,
            });
        }

        // =============================
        // STEP 12: RETURN AUTHENTICATED SESSION
        // =============================
        const safeAdmin = { id: admin.id, email: admin.email, role: admin.role };

        return NextResponse.json({
            success: true,
            accessToken,
            safeAdmin
        });

    } catch (error) {
        console.error("2FA_VERIFY_ERROR:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
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
        return NextResponse.json({ message: "2FA verify endpoint is active" });

    } catch (error) {
        console.error("2FA_VERIFY_GET_ERROR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}