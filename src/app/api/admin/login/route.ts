// src/app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { parseDeviceInfo } from "@/lib/admin/device";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
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
        const { email, password } = await req.json();
        const { userAgent, ipAddress, device, browser } = getClientInfo(req);

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required!" },
                { status: 400 }
            );
        }

        const STATUS_MESSAGES = {
            0: "Account is inactive!",
            3: "Account is not active!",
        };

        // STEP 2: Validate credentials
        const admin = await db.superAdmin.findUnique({
            where: { email },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                password: true,
                role: true,
                status: true,
                two_factor_enabled: true,
                two_factor_secret: true,
            },
        });

        if (!admin || admin.status !== 1) {
            return NextResponse.json(
                {
                    success: false,
                    error: STATUS_MESSAGES[admin?.status as keyof typeof STATUS_MESSAGES] || "Invalid credentials!",
                },
                { status: 403 }
            );
        }

        // if (admin?.status === 0) {
        //     return NextResponse.json(
        //         { success: false, error: "Account is inactive!" },
        //         { status: 403 }
        //     );
        // }

        // if(admin?.status === 3) {
        //     return NextResponse.json(
        //         { success: false, error: "Account is not active!" },
        //         { status: 403 }
        //     );
        // }

        // if (!admin) {
        //     return NextResponse.json(
        //         { success: false, error: "Invalid credentials!" },
        //         { status: 401 }
        //     );
        // }

        const isValid = await bcrypt.compare(password, admin.password);

        if (!isValid) {
            return NextResponse.json(
                { success: false, error: "Invalid credentials!" },
                { status: 401 }
            );
        }

        const cookieStore = await cookies();

        // STEP 3: Determine 2FA flow
        const hasSecret = !!admin.two_factor_secret;

        if (hasSecret) {
            // Store isFirstTimeSetup in the temp session cookie (safe, not from client)
            const isFirstTimeSetup = !admin.two_factor_enabled;

            cookieStore.set(
                "2fa_temp_session",
                JSON.stringify({
                    id: admin.id,
                    email: admin.email,
                    isFirstTimeSetup,
                }),
                {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                    path: "/",
                    maxAge: 60 * 5, // 5 minutes
                }
            );

            if (isFirstTimeSetup) {
                // two_factor_enabled = 0 → first login, show QR code + verify
                const otpauthUrl = `otpauth://totp/Cantech:${admin.email}?secret=${admin.two_factor_secret}&issuer=Cantech&algorithm=SHA1&digits=6&period=30`;

                return NextResponse.json({
                    success: true,
                    requires2FA: true,
                    requiresSetup: true,
                    secret: admin.two_factor_secret,
                    otpauthUrl,
                });
            }

            // two_factor_enabled = 1 → existing user, just verify OTP
            return NextResponse.json({
                success: true,
                requires2FA: true,
                requiresSetup: false,
            });
        }

        // STEP 4: No 2FA — generate tokens and create session directly
        const accessToken = createAccessToken(admin.id);
        const refreshToken = createRefreshToken(admin.id);

        const refreshHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        // const deviceName = parseDeviceInfo(userAgent)

        // STEP 5: Update last login info
        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                last_login_at: getISTDateWithOffset(0),
                last_login_ip: ipAddress,
            },
        });

        // STEP 6: Create persistent session
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

        // STEP 7: Log successful login
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

        // STEP 8: Set refresh token cookie
        cookieStore.set("admin_refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 24 * 60 * 60, // 24 hours
        });

        // STEP 9: Return access token
        const safeAdmin = {
            id: admin.id,
            email: admin.email,
            role: admin.role,
            two_factor_enabled: admin.two_factor_enabled,
        };

        return NextResponse.json({
            success: true,
            accessToken,
            admin: safeAdmin,
        });
    } catch (error) {
        // console.error("ADMIN_LOGIN_ERROR:", error);

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

        return NextResponse.json({ message: "Admin login endpoint is active" });
    } catch (error) {
        // console.error("ADMIN_LOGIN_GET_ERROR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}