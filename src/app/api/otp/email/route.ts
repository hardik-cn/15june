// src/app/api/otp/email/route.ts
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { checkEmailLimits, checkPendingEmailOtp } from "@/lib/security/emailOtpRateLimit";
import { checkEmailAbuse } from "@/lib/security/emailOtpGuard";
import { generateOtp, hashOtp, getTimeWindow } from "@/lib/security/otpGenerate";
import { sendEmailOtp } from "@/emails/sendEmailOtp";

export async function POST(req: Request) {
    try {
        const { email, purpose = "register" } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        // Rate limit
        const limit = await checkEmailLimits(email);
        if (!limit.allowed) {
            return NextResponse.json({ error: limit.message }, { status: 429 });
        }

        // One OTP at a time
        const pending = await checkPendingEmailOtp(email);
        if (!pending) {
            return NextResponse.json(
                { error: "OTP already sent. Please verify first." },
                { status: 429 }
            );
        }

        // Domain abuse
        const safe = await checkEmailAbuse(email);
        if (!safe) {
            return NextResponse.json(
                { error: "Too many requests from this domain" },
                { status: 429 }
            );
        }

        // Generate OTP
        const otp = generateOtp();

        // Get current time window
        const window = getTimeWindow();

        // Create bound hash
        const hashed = hashOtp(otp, email, window);

        // Store hashed OTP
        await redis.set(`otp:email:${purpose}:${email}`, JSON.stringify({ hash: hashed, window }), "EX", 300);

        // // Track attempts
        await redis.set(`otp:email:attempts:${purpose}:${email}`, 0, "EX", 300);

        // Send email via SendGrid
        await sendEmailOtp(email, otp);

        return NextResponse.json({
            success: true,
            cooldown: 60,
        });

    } catch (err: any) {
        console.error("EMAIL OTP SEND ERROR:", err);

        return NextResponse.json(
            { error: "Failed to send OTP" },
            { status: 500 }
        );
    }
}