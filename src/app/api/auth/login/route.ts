// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { validateWhmcsLogin } from "@/lib/whmcs/client/login/validateLogin";
import { loginSchema } from "@/lib/validators/loginSchema";
import jwt from "jsonwebtoken";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { detectDevice } from "@/lib/auth/device";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";
import { logUserActivityFromRequest } from "@/lib/userActivityLog";
import { getLoginLocation } from "@/lib/security/getLocation";
import { countryCodes } from "@/lib/countries";
import { checkLoginRateLimit, recordFailedLogin, clearLoginAttempts } from "@/lib/security/loginRateLimit";

export async function POST(req: Request) {

    try {

        const ip =
            req.headers.get("cf-connecting-ip") ||
            req.headers.get("x-real-ip") ||
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";
        const language = req.headers.get("accept-language") || "";

        // =============================
        // DEVICE FINGERPRINT
        // =============================

        const deviceFingerprint = crypto.createHash("sha256").update(`${ip}:${userAgent}:${language}`).digest("hex");

        // =============================
        // VALIDATION
        // =============================

        let body;

        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        const { email, password } = parsed.data;

        // =============================
        // REDIS RATE LIMIT CHECK
        // =============================

        const allowed = await checkLoginRateLimit(
            ip,
            email,
            deviceFingerprint
        );

        if (!allowed) {
            logUserActivityFromRequest(req, {
                logAction: "LOGIN_RATE_LIMITED",
                logMessage: `Login rate limited for email: ${email}`,
                email,
                status: "failed",
                rawData: { reason: "rate_limited" },
            });

            return NextResponse.json(
                { error: "Too many login attempts. Try again in 1 minutes." },
                { status: 429 }
            );
        }

        // =============================
        // TRY WHMCS LOGIN
        // =============================

        const whmcsUser = await validateWhmcsLogin(email, password);

        let user = null;

        if (whmcsUser) {

            user = await db.user.findUnique({
                where: { email }
            });

            const dialCode = countryCodes.find(country => country.iso === whmcsUser.countryCode)?.code || "+91";

            if (!user) {

                user = await db.user.create({
                    data: {
                        firstName: whmcsUser.firstName,
                        lastName: whmcsUser.lastName,
                        email: whmcsUser.email,
                        phone: whmcsUser.phone ?? "",
                        countryCode: dialCode,
                        passwordHash: await bcrypt.hash(password, 12),
                        isEmailVerified: 1,
                        isPhoneVerified: 1,
                        whmcsClientId: whmcsUser.clientId,
                        lockStatus: "active",
                    },
                });

                await db.onboarding.create({
                    data: {
                        userId: user.id,
                        uuid: uuidv4(),
                        whmcsClientId: whmcsUser.clientId,
                        status: "completed",
                    },
                });

            } else {

                await db.user.update({
                    where: { id: user.id },
                    data: {
                        passwordHash: await bcrypt.hash(password, 12),
                        firstName: whmcsUser.firstName,
                        lastName: whmcsUser.lastName,
                        phone: whmcsUser.phone ?? user.phone,
                        whmcsClientId: whmcsUser.clientId,
                    },
                });

            }

        } else {

            const localUser = await db.user.findUnique({
                where: { email }
            });

            if (!localUser || localUser.whmcsClientId) {

                await recordFailedLogin(
                    ip,
                    email,
                    deviceFingerprint
                );

                logUserActivityFromRequest(req, {
                    logAction: "LOGIN_FAILED",
                    logMessage: `Failed login attempt for email: ${email}`,
                    email,
                    status: "failed",
                    rawData: { reason: "invalid_credentials" },
                });

                return NextResponse.json(
                    { error: "Invalid credentials" },
                    { status: 401 }
                );
            }

            const valid = await bcrypt.compare(
                password,
                localUser.passwordHash
            );

            if (!valid) {

                await recordFailedLogin(
                    ip,
                    email,
                    deviceFingerprint
                );

                logUserActivityFromRequest(req, {
                    logAction: "LOGIN_FAILED",
                    logMessage: `Failed login attempt for email: ${email} (wrong password)`,
                    email,
                    userId: localUser.id,
                    username: `${localUser.firstName} ${localUser.lastName}`,
                    status: "failed",
                    rawData: { reason: "wrong_password" },
                });

                return NextResponse.json(
                    { error: "Invalid credentials" },
                    { status: 401 }
                );
            }

            user = localUser;
        }

        // =============================
        // CLEAR RATE LIMIT ON SUCCESS
        // =============================

        await clearLoginAttempts(
            ip,
            email,
            deviceFingerprint
        );

        // =============================
        // DEVICE DETECTION
        // =============================

        const device = detectDevice(userAgent);

        // =============================
        // CHECK 2FA
        // =============================

        const pendingAppSetup = await db.twoFactorMethod.findFirst({
            where: {
                userId: user.id,
                type: "APP",
                enabled: false
            }
        });

        const twoFactorMethods = await db.twoFactorMethod.findMany({
            where: {
                userId: user.id,
                enabled: true
            }
        });

        if (pendingAppSetup) {

            const tempToken = jwt.sign(
                {
                    userId: user.id,
                    purpose: "2fa-setup"
                },
                process.env.ACCESS_TOKEN_SECRET!,
                {
                    expiresIn: "10m"
                }
            );

            return NextResponse.json({
                success: true,
                require2FASetup: true,
                tempToken
            });

        }

        if (twoFactorMethods.length > 0) {
            // Create a temporary token valid for 5 minutes
            const tempToken = jwt.sign(
                { userId: user.id, purpose: "2fa" },
                process.env.ACCESS_TOKEN_SECRET!,
                { expiresIn: "5m" }
            );

            return NextResponse.json({
                success: true,
                require2FA: true,
                methods: twoFactorMethods.map(m => m.type),
                email: user.email,
                phone: `${user.countryCode}${user.phone}`,
                tempToken
            });
        }

        // =============================
        // TOKEN CREATION (NO 2FA)
        // =============================

        const accessToken = createAccessToken(user.id);
        const refreshToken = createRefreshToken(user.id);

        const refreshHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        // =============================
        // SESSION CREATE
        // =============================

        await db.session.create({
            data: {
                id: uuidv4(),
                userId: user.id,
                refreshHash,
                deviceName: device,
                userAgent,
                ipAddress: ip,
                expiresAt: new Date(
                    Date.now() + 1000 * 60 * 60 * 24 * 30
                )
            }
        });

        const loginLocation = await getLoginLocation(ip);

        await sendTemplateEmail({
            templateSlug: "login-alert",
            to: user.email,
            variables: {
                first_name: user.firstName,
                login_location: loginLocation,
                device,
                user_agent: userAgent,
                ip_address: ip,
                login_time: new Date().toLocaleString(),
                support_email: "support@cantech.in",
                security_url: `${process.env.NEXT_PUBLIC_APP_URL}/security-settings`,
                current_year: new Date().getFullYear().toString(),
            },
        }).catch((error) => { console.log("Login alert email sent failed", error); });

        // Log successful login
        logUserActivityFromRequest(req, {
            logAction: "LOGIN_SUCCESS",
            logMessage: `User logged in successfully: ${user.email}`,
            userId: user.id,
            username: `${user.firstName} ${user.lastName}`,
            email: user.email,
            status: "success",
            rawData: { device },
        });

        // =============================
        // RESPONSE
        // =============================

        const res = NextResponse.json({
            success: true,
            accessToken
        });

        res.cookies.set("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 30
        });

        return res;

    } catch (err) {

        console.error("Login error:", err);

        return NextResponse.json(
            { error: "Login failed" },
            { status: 500 }
        );

    }
}
