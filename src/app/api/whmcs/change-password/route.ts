// src/app/api/whmcs/change-password/route.ts

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/securePassword";
import bcrypt from "bcryptjs";
import { getWhmcsUserId } from "@/lib/whmcs/changePassword";
import { logUserActivityFromRequest } from "@/lib/userActivityLog";
import { z } from "zod";

const changePasswordSchema = z.object({
    existingPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
    try {
        // ── 1. Authenticate ───────────────────────────────────────────────────
        const sessionUser = await getUserFromRequest(req);

        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!sessionUser.whmcsClientId) {
            return NextResponse.json(
                { error: "Account not linked to WHMCS" },
                { status: 403 }
            );
        }

        // ── 2. Parse & validate body ─────────────────────────────────────────
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }

        const parsed = changePasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { existingPassword, newPassword } = parsed.data;

        // ── 3. Verify passwordHash exists ─────────────────────────────────────
        if (!sessionUser.passwordHash) {
            return NextResponse.json(
                { error: "Password not set for this account. Please use password reset." },
                { status: 400 }
            );
        }

        // ── 4. Verify current password ────────────────────────────────────────
        const isValid = await bcrypt.compare(existingPassword, sessionUser.passwordHash);

        if (!isValid) {
            logUserActivityFromRequest(req, {
                logAction: "CHANGE_PASSWORD_FAILED",
                logMessage: `Change password failed: incorrect current password for user ${sessionUser.email}`,
                userId: sessionUser.id,
                username: `${sessionUser.firstName} ${sessionUser.lastName}`,
                email: sessionUser.email,
                status: "failed",
                rawData: { reason: "incorrect_current_password" },
            });

            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 400 }
            );
        }

        // ── 5. Prevent same password reuse ────────────────────────────────────
        const isSamePassword = await bcrypt.compare(newPassword, sessionUser.passwordHash);

        if (isSamePassword) {
            logUserActivityFromRequest(req, {
                logAction: "CHANGE_PASSWORD_FAILED",
                logMessage: `Change password failed: same password reuse by user ${sessionUser.email}`,
                userId: sessionUser.id,
                username: `${sessionUser.firstName} ${sessionUser.lastName}`,
                email: sessionUser.email,
                status: "failed",
                rawData: { reason: "same_password_reuse" },
            });

            return NextResponse.json(
                { error: "New password must be different from current password" },
                { status: 400 }
            );
        }

        /* ======================================================
           6. Get Id using WHMCS GetUsers API
        ====================================================== */

        const whmcsUserId = await getWhmcsUserId(sessionUser.email);

        if (!whmcsUserId) {
            console.error(
                `Could not resolve WHMCS user ID for email: ${sessionUser.email}`
            );
            return NextResponse.json(
                { error: "Could not locate your WHMCS account. Please contact support." },
                { status: 400 }
            );
        }

        console.log(`Resolved WHMCS user ID: ${whmcsUserId} for client ID: ${sessionUser.whmcsClientId}`);

        /* ======================================================
           7. UPDATE PASSWORD IN WHMCS (PW BRIDGE)
        ====================================================== */

        const bridgeRes = await fetch(
            `${process.env.WHMCS_URL}/modules/addons/pwbridge/api.php`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    api_key: process.env.WHMCS_PWBRIDGE_KEY!,
                    user_id: String(whmcsUserId),
                    email: sessionUser.email,
                    new_password: newPassword,
                }),
            }
        );

        if (!bridgeRes.ok) {
            console.error("WHMCS bridge HTTP error:", bridgeRes.status);
            return NextResponse.json(
                { error: "WHMCS service unavailable. Please try again later." },
                { status: 502 }
            );
        }

        const bridgeData = await bridgeRes.json();
        console.log("WHMCS RESPONSE:", bridgeData);

        if (bridgeData.result !== "success") {
            return NextResponse.json(
                { error: bridgeData.message || "WHMCS password update failed" },
                { status: 400 }
            );
        }

        /* ======================================================
           8. SYNC LOCAL DB — bcrypt hash + encrypted lockStatus
        ====================================================== */

        const passwordHash = await bcrypt.hash(newPassword, 12);
        const encryptedPassword = encrypt(newPassword);

        await db.user.update({
            where: { id: sessionUser.id },
            data: {
                passwordHash,
                lockStatus: encryptedPassword,
            },
        });

        logUserActivityFromRequest(req, {
            logAction: "CHANGE_PASSWORD_SUCCESS",
            logMessage: `Password changed successfully for user: ${sessionUser.email}`,
            userId: sessionUser.id,
            username: `${sessionUser.firstName} ${sessionUser.lastName}`,
            email: sessionUser.email,
            status: "success",
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Change password error:", error);

        return NextResponse.json(
            { error: "An unexpected error occurred. Please try again." },
            { status: 500 }
        );
    }
}