// src/app/api/otp/email/verify/route.ts
import crypto from "crypto";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { hashOtp, getTimeWindow } from "@/lib/security/otpGenerate";
import { clearPendingEmailOtp } from "@/lib/security/emailOtpRateLimit";

export async function POST(req: Request) {
    try {
        const { email, otp, purpose = "register" } = await req.json();

        if (!email || !otp) {
            return NextResponse.json(
                { error: "Invalid request" },
                { status: 400 }
            );
        }

        const key = `otp:email:${purpose}:${email}`;
        const attemptsKey = `otp:email:attempts:${purpose}:${email}`;

        const stored = await redis.get(key);

        if (!stored) {
            return NextResponse.json(
                { error: "OTP expired" },
                { status: 400 }
            );
        }

        const { hash, window } = JSON.parse(stored);

        //  Check attempt limit FIRST
        const attempts = Number(await redis.get(attemptsKey) || 0);

        if (attempts >= 5) {
            await redis.del(key);
            await clearPendingEmailOtp(email);

            return NextResponse.json(
                { error: "Too many attempts. OTP expired." },
                { status: 429 }
            );
        }

        // Check time window
        const currentWindow = getTimeWindow();

        if (currentWindow !== window && currentWindow !== window + 1) {
            return NextResponse.json(
                { error: "OTP expired" },
                { status: 400 }
            );
        }

        // Validate OTP
        const incomingHash = hashOtp(otp, email, window);

        const valid = crypto.timingSafeEqual(
            Buffer.from(incomingHash),
            Buffer.from(hash)
        );

        if (!valid) {
            await redis.incr(attemptsKey);

            return NextResponse.json(
                { error: "Invalid OTP" },
                { status: 400 }
            );
        }

        // SUCCESS
        await redis.del(key);
        await redis.del(attemptsKey);
        await clearPendingEmailOtp(email);

        await redis.set(`otp:email:verified:${email}`, "1", "EX", 600);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("VERIFY ERROR:", err);

        return NextResponse.json(
            { error: "Verification failed" },
            { status: 500 }
        );
    }
}