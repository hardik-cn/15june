// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { encrypt } from "@/lib/securePassword";
import { logUserActivityFromRequest } from "@/lib/userActivityLog";

/* =========================================
   GET — Validate Reset Token
========================================= */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json(
                { success: false },
                { status: 400 }
            );
        }

        const reset = await db.passwordReset.findUnique({
            where: { token },
        });

        if (
            !reset ||
            reset.used ||
            reset.expiresAt < new Date()
        ) {
            return NextResponse.json(
                { success: false },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            email: reset.email,
            clientid: String(reset.whmcsClientId),
        });

    } catch (error) {
        console.error("Reset token validation error:", error);

        return NextResponse.json(
            { success: false },
            { status: 500 }
        );
    }
}

/* =========================================
   POST — Reset Password
========================================= */
export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json(
                { error: "Invalid request" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        const reset = await db.passwordReset.findUnique({
            where: { token },
        });

        if (
            !reset ||
            reset.used ||
            reset.expiresAt < new Date()
        ) {
            logUserActivityFromRequest(req, {
                logAction: "RESET_PASSWORD_FAILED",
                logMessage: "Password reset attempted with invalid or expired token",
                status: "failed",
                rawData: { reason: "invalid_or_expired_token" },
            });

            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 400 }
            );
        }

        /* =====================================
           UPDATE PASSWORD USING WHMCS PW BRIDGE
        ===================================== */

        const bridgeRes = await fetch(
            `${process.env.WHMCS_URL}/modules/addons/pwbridge/api.php`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    api_key: process.env.WHMCS_PWBRIDGE_KEY!,
                    user_id: String(reset.whmcsUserId),
                    email: reset.email,
                    new_password: password,
                }),
            }
        );

        const bridgeData = await bridgeRes.json();

        console.log("PW Bridge Response:", bridgeData);

        if (bridgeData.result !== "success") {
            logUserActivityFromRequest(req, {
                logAction: "RESET_PASSWORD_FAILED",
                logMessage: `Password reset WHMCS update failed for email: ${reset.email}`,
                email: reset.email,
                status: "failed",
                rawData: { reason: "whmcs_update_failed", message: bridgeData.message },
            });

            return NextResponse.json(
                { error: bridgeData.message || "WHMCS password update failed" },
                { status: 400 }
            );
        }

        /* =====================================
           SYNC LOCAL USER PASSWORD
        ===================================== */

        const localUser = await db.user.findUnique({
            where: { email: reset.email },
        });

        if (localUser) {
            const passwordHash = await bcrypt.hash(password, 12);

            if (localUser.lockStatus === "active") {
                await db.user.update({
                    where: { id: localUser.id },
                    data: {
                        passwordHash,
                    },
                });
            } else {
                await db.user.update({
                    where: { id: localUser.id },
                    data: {
                        passwordHash,
                        lockStatus: encrypt(password),
                    },
                });
            }
        }

        /* =====================================
           MARK TOKEN USED
        ===================================== */

        await db.passwordReset.update({
            where: { token },
            data: { used: true },
        });

        logUserActivityFromRequest(req, {
            logAction: "RESET_PASSWORD_SUCCESS",
            logMessage: `Password reset successfully for email: ${reset.email}`,
            userId: localUser?.id ?? null,
            username: localUser ? `${localUser.firstName} ${localUser.lastName}` : null,
            email: reset.email,
            status: "success",
        });

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return NextResponse.json(
            { error: "Reset failed" },
            { status: 500 }
        );
    }
}