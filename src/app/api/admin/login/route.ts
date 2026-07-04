// src/app/api/admin/login/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import * as OTPAuth from "otpauth";
import { db } from "@/lib/db";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { parseDeviceInfo } from "@/lib/admin/device";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { getISTDateWithOffset } from "@/lib/getISTDate";
import { loginSchema } from "@/lib/validators/loginSchema";

/**
 * Extract client information from the incoming request.
 * Used for login auditing, session tracking, and security monitoring.
 */
function getClientInfo(req: Request) {
    const userAgent = req.headers.get("user-agent") ?? "unknown";
    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { device, browser } = parseDeviceInfo(userAgent);

    return { userAgent, ipAddress, device, browser };
}

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: PARSE & VALIDATE REQUEST DATA
        // =============================
        let body;
        try {
            body = await req.json();

        } catch {
            return NextResponse.json({ success: false, error: "Invalid JSON payload!" }, { status: 400 });
        }

        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            const issues = parsed.error.issues;
            let errorMsg = "Invalid input data!";

            const emailIssue = issues.find(i => i.path.includes("email"));
            const passwordIssue = issues.find(i => i.path.includes("password"));

            if (emailIssue) {
                const issueAny = emailIssue as any;
                if (issueAny.code === "invalid_string" && issueAny.validation === "email") {
                    errorMsg = "Please enter a valid email address.";
                } else {
                    errorMsg = "Email is required.";
                }
            } else if (passwordIssue) {
                const issueAny = passwordIssue as any;
                if (issueAny.code === "too_small") {
                    errorMsg = "Password must be at least 6 characters.";
                } else {
                    errorMsg = "Password is required.";
                }
            }

            return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
        }

        const { email, password } = parsed.data;
        const { userAgent, ipAddress, device, browser } = getClientInfo(req);

        // =============================
        // ACCOUNT STATUS MESSAGES
        // =============================
        const STATUS_MESSAGES = { 0: "Account is inactive!", 3: "Account is not active!" };

        // =============================
        // STEP 2: FETCH ADMIN ACCOUNT
        // =============================
        const admin = await db.superAdmin.findUnique({
            where: { email },
            // select: {
            //     id: true,
            //     first_name: true,
            //     last_name: true,
            //     email: true,
            //     password: true,
            //     role: true,
            //     status: true,
            //     two_factor_enabled: true,
            //     two_factor_secret: true,
            //     two_factor_configured: true,
            // },
        });

        // =============================
        // STEP 3: VALIDATE ACCOUNT STATUS
        // =============================
        if (!admin || admin.status !== 1) {
            return NextResponse.json({ success: false, error: STATUS_MESSAGES[admin?.status as keyof typeof STATUS_MESSAGES] || "Invalid credentials!" }, { status: 403 });
        }

        // =============================
        // STEP 4: VERIFY PASSWORD
        // =============================
        const isValid = await bcrypt.compare(password, admin.password);

        if (!isValid) {
            return NextResponse.json({ success: false, error: "Invalid credentials!" }, { status: 401 });
        }

        const cookieStore = await cookies();

        // =============================
        // STEP 5: HANDLE 2FA FLOW
        // =============================
        if (admin.two_factor_enabled) {
            let secret = admin.two_factor_secret;
            const isFirstTimeSetup = !admin.two_factor_configured;

            if (isFirstTimeSetup && !secret) {
                const otpSecret = new OTPAuth.Secret({ size: 20 });
                secret = otpSecret.base32;
            }

            // Generate a temporary JWT token for the 2FA verification step
            const tempToken = jwt.sign(
                { id: admin.id, email: admin.email, isFirstTimeSetup, tempSecret: isFirstTimeSetup ? secret : undefined },
                process.env.ACCESS_TOKEN_SECRET || "default_secret",
                { expiresIn: "5m" }
            );

            // First login after 2FA setup
            if (isFirstTimeSetup) {
                const otpauthUrl = `otpauth://totp/Cantech:${admin.email}?secret=${secret}&issuer=Cantech&algorithm=SHA1&digits=6&period=30`;

                return NextResponse.json({
                    success: true,
                    requires2FA: true,
                    requiresSetup: true,
                    secret: secret,
                    otpauthUrl,
                    tempToken
                });
            }

            // Existing 2FA-enabled account
            return NextResponse.json({
                success: true,
                requires2FA: true,
                requiresSetup: false,
                tempToken
            });
        }

        // =============================
        // STEP 6: GENERATE AUTH TOKENS
        // =============================
        const accessToken = createAccessToken(admin.id);
        const refreshToken = createRefreshToken(admin.id);

        // Store only a SHA-256 hash of the refresh token.
        const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        // =============================
        // STEP 7: UPDATE LOGIN DETAILS
        // =============================
        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                last_login_at: getISTDateWithOffset(0),
                last_login_ip: ipAddress,
            },
        });

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
        // STEP 9: LOG LOGIN ACTIVITY
        // =============================
        await logAdminActivity({
            logAction: "LOGIN_SUCCESS",
            logMessage: "You have logged in successfully!",
            adminId: admin.id,
            adminName: `${admin.first_name} ${admin.last_name}`,
            ipAddress,
            userAgent,
            device,
            browser,
        });

        // =============================
        // STEP 10: SET REFRESH COOKIE
        // =============================
        cookieStore.set("admin_refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 24 * 60 * 60, // 24 Hours
        });

        // =============================
        // STEP 11: PREPARE SAFE RESPONSE
        // =============================
        const safeAdmin = {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            two_factor_enabled: admin.two_factor_enabled,
        };

        // =============================
        // STEP 12: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            accessToken,
            admin: safeAdmin
        });

    } catch (error) {
        console.error("Admin Login Error:", error);
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
        // STEP 2: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({ message: "Admin login endpoint is active" });

    } catch (error) {
        console.error("Admin Login GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}