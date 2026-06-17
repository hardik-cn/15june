// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { checkWhmcsClientExists } from "@/lib/whmcs/client/checkClientExists";
// import { sendResetPasswordEmail } from "@/emails/sendResetPasswordEmail";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";
import { logUserActivityFromRequest } from "@/lib/userActivityLog";
import { z } from "zod";

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email format"),
});

export async function POST(req: Request) {
    try {
        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        const parsed = forgotPasswordSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid email address", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { email } = parsed.data;

        const client = await checkWhmcsClientExists(email);

        if (!client) {
            logUserActivityFromRequest(req, {
                logAction: "FORGOT_PASSWORD_REQUEST",
                logMessage: `Forgot password requested for unknown email: ${email}`,
                email,
                status: "failed",
                rawData: { reason: "email_not_found" },
            });

            return NextResponse.json({
                success: true,
            });
        }

        const token = crypto.randomBytes(32).toString("hex");

        const expires = new Date(
            Date.now() + 1000 * 60 * 10
        ); // 10 min

        await db.passwordReset.create({
            data: {
                email,
                whmcsClientId: client.clientid,
                whmcsUserId: client.userid,
                token,
                expiresAt: expires,
            },
        });

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/forgot-password/reset?token=${token}`;

        await sendTemplateEmail({
            templateSlug: "reset-password",
            to: email,
            variables: {
                reset_url: resetUrl,
                support_email: process.env.SUPPORT_EMAIL || "support@cantech.in",
                current_year: new Date().getFullYear().toString(),
            },
        });

        logUserActivityFromRequest(req, {
            logAction: "FORGOT_PASSWORD_REQUEST",
            logMessage: `Forgot password link sent to email: ${email}`,
            email,
            status: "success",
            rawData: { whmcsClientId: client.clientid },
        });

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed" },
            { status: 500 }
        );
    }
}