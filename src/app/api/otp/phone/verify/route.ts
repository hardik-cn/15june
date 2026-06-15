// src/app/api/otp/phone/verify/route.ts
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";
import twilio from "twilio";
import { clearPendingOtp } from "@/lib/security/otpRateLimit";

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: Request) {
    try {
        const { phone, otp } = await req.json();

        if (!phone || !otp) {
            return NextResponse.json(
                { error: "Phone and OTP required" },
                { status: 400 }
            );
        }

        const verificationCheck = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
            .verificationChecks.create({
                to: phone,
                code: otp,
            });

        if (verificationCheck.status === "approved") {

            await clearPendingOtp(phone);

            await redis.set(
                `otp:phone:verified:${phone}`,
                "1",
                "EX",
                600
            );

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: "Invalid OTP" },
            { status: 400 }
        );

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "OTP verification failed" },
            { status: 500 }
        );
    }
}