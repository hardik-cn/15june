// src/app/api/admin/2fa/verify/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import * as OTPAuth from "otpauth";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";
import { getISTDateWithOffset } from "@/lib/getISTDate";

function getClientInfo(req: Request) {
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const ipAddress =
        req.headers.get("x-forwarded-for") ??
        req.headers.get("x-real-ip") ??
        "unknown";
    const { device, browser } = parseDeviceInfo(userAgent);
    return { userAgent, ipAddress, device, browser };
}

export async function POST(req: Request) {
    try {
        // STEP 1: Parse input
        const { code } = await req.json();
        const { userAgent, ipAddress, device, browser } = getClientInfo(req);

        if (!code || code.length !== 6) {
            return NextResponse.json(
                { success: false, error: "A 6-digit OTP code is required." },
                { status: 400 }
            );
        }

        const cookieStore = await cookies();

        // STEP 2: Validate temp session (set during /api/admin/login)
        const tempSession = cookieStore.get("2fa_temp_session");

        if (!tempSession) {
            return NextResponse.json(
                { success: false, error: "Session expired. Please login again." },
                { status: 401 }
            );
        }

        // Also read isFirstTimeSetup from the secure httpOnly cookie
        const sessionData = JSON.parse(tempSession.value) as {
            id: number;
            email: string;
            isFirstTimeSetup: boolean;
        };
        const id = Number(sessionData.id);
        const isFirstTimeSetup = sessionData.isFirstTimeSetup ?? false;

        // STEP 3: Fetch admin record
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
            return NextResponse.json(
                { success: false, error: "Admin not found." },
                { status: 404 }
            );
        }

        if (!admin.two_factor_secret) {
            return NextResponse.json(
                { success: false, error: "2FA is not configured for this account." },
                { status: 400 }
            );
        }

        // STEP 4: Verify the TOTP code
        const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(admin.two_factor_secret),
            algorithm: "SHA1",
            digits: 6,
            period: 30,
        });

        // window: 1 allows ±30s clock drift
        const delta = totp.validate({ token: code, window: 1 });

        if (delta === null) {
            return NextResponse.json(
                { success: false, error: "Invalid or expired code. Please try again." },
                { status: 400 }
            );
        }

        // STEP 5: OTP verified — update admin record
        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                last_login_at: getISTDateWithOffset(0),
                last_login_ip: ipAddress,
                two_factor_enabled: true,
            },
        });

        // STEP 6: Clear the short-lived temp session
        cookieStore.delete("2fa_temp_session");

        // STEP 7: Generate tokens
        const accessToken = createAccessToken(admin.id);
        const refreshToken = createRefreshToken(admin.id);

        const refreshHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        // const { device } = parseDeviceInfo(userAgent); 

        // STEP 8: Create persistent session
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

        // STEP 9: Set refresh token cookie
        cookieStore.set("admin_refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 24 * 60 * 60, // 24 hours
        });

        // STEP 10: Always log LOGIN_SUCCESS
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

        // STEP 11: Only log 2FA_VERIFIED on first time setup
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

        // STEP 12: Return access token
        const safeAdmin = {
            id: admin.id,
            email: admin.email,
            role: admin.role,
        };
        return NextResponse.json({
            success: true,
            accessToken,
            safeAdmin,
        });
    } catch (error) {
        console.error("2FA_VERIFY_ERROR:", error);

        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ message: "2FA verify endpoint is active" });
    } catch (error) {
        console.error("2FA_VERIFY_GET_ERROR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}