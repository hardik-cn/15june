// src/app/api/otp/phone/route.ts
import { NextResponse } from "next/server";
import twilio from "twilio";
import { redis } from "@/lib/redis";
import { checkPhoneLimits, checkPendingOtp } from "@/lib/security/otpRateLimit";
import { checkPrefixAbuse } from "@/lib/security/otpGuard";
import { checkPhoneIntelligence } from "@/lib/security/phoneIntelligence";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json(
                { error: "Phone is required" },
                { status: 400 }
            );
        }

        // Phone Limits (3 per 10 min / 5 per day)
        const phoneLimit = await checkPhoneLimits(phone);
        if (!phoneLimit.allowed) {
            return NextResponse.json(
                { error: phoneLimit.message },
                { status: 429 }
            );
        }

        const pending = await checkPendingOtp(phone);
        if (!pending) {
            return NextResponse.json(
                { error: "OTP already sent. Please verify first." },
                { status: 429 }
            );
        }

        // Prefix Attack Detection
        const prefixSafe = await checkPrefixAbuse(phone);
        if (!prefixSafe) {
            return NextResponse.json(
                { error: "Too many similar numbers detected" },
                { status: 429 }
            );
        }

        // Twilio Intelligence
        const intel = await checkPhoneIntelligence(phone);
        if (!intel.allowed) {
            return NextResponse.json(
                { error: intel.message },
                { status: 400 }
            );
        }

        // Get current attempt count (AFTER increment)
        const key10Min = `otp:phone:${phone}`;
        // const count10Min = Number(await redis.get(key10Min) || 1);

        const verification = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
            .verifications.create({
                to: phone,
                channel: "sms",
            });

        return NextResponse.json({
            success: true,
            status: verification.status,
            cooldown: 60,
        });

    } catch (error: any) {
        console.error("OTP Send Error:", error);

        return NextResponse.json(
            { error: error.message || "Failed to send OTP" },
            { status: 500 }
        );
    }
}