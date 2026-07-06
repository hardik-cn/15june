// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { encrypt } from "@/lib/securePassword";
// import { sendWelcomeEmail } from "@/emails/sendWelcomeEmail";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";
import { sendSlackNotification } from "@/lib/slack/sendSlackNotification";
import { registerSchema } from "@/lib/validators/registerSchema";
import { normalizePhone } from "@/lib/security/phone";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Zod Validation
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            const errors = parsed.error.issues.map((err) => ({
                field: err.path[0],
                message: err.message,
            }));

            return NextResponse.json(
                { errors },
                { status: 400 }
            );
        }

        const {
            firstName,
            lastName,
            phone,
            countryCode,
            email,
            password,
            phoneVerified,
            emailVerified,
        } = parsed.data;

        // Normalize input
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedPhone = phone.trim();

        // OTP enforcement (never trust frontend)
        if (!phoneVerified || !emailVerified) {
            return NextResponse.json(
                { error: "Phone and Email must be verified" },
                { status: 400 }
            );
        }

        const redisEmailVerified = await redis.get(`otp:email:verified:${normalizedEmail}`);

        // if (!redisEmailVerified) {
        //     return NextResponse.json(
        //         { error: "Email verification required" },
        //         { status: 400 }
        //     );
        // }

        const fullPhone = normalizePhone(countryCode, normalizedPhone);

        console.log(
            "REGISTER CHECK KEY:",
            `otp:phone:verified:${fullPhone}`
        );

        const redisPhoneVerified = await redis.get(`otp:phone:verified:${fullPhone}`);

        console.log("PHONE VERIFIED VALUE:", redisPhoneVerified);

        // if (!redisPhoneVerified) {
        //     return NextResponse.json(
        //         { error: "Phone verification required" },
        //         { status: 400 }
        //     );
        // }


        // Check existing user
        const existing = await db.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 400 }
            );
        }

        // Hash password (secure)
        const passwordHash = await bcrypt.hash(password, 12);

        const encryptedPassword = encrypt(password);

        // DB Transaction
        const result = await db.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: normalizedPhone,
                    countryCode,
                    email: normalizedEmail,
                    passwordHash,
                    isPhoneVerified: 1,
                    isEmailVerified: 1,
                    lockStatus: encryptedPassword,
                    createdAt: getISTDateWithOffset(0),
                    updatedAt: getISTDateWithOffset(0),
                },
            });

            const onboarding = await tx.onboarding.create({
                data: {
                    uuid: uuidv4(),
                    userId: user.id,
                    whmcsClientId: null,
                    createdAt: getISTDateWithOffset(0),
                    updatedAt: getISTDateWithOffset(0),
                },
            });

            return { user, onboarding };
        });

        // await redis.del(`otp:email:verified:${normalizedEmail}`);

        // await redis.del(`otp:phone:verified:${fullPhone}`);

        const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?id=${result.onboarding.uuid}`;

        sendTemplateEmail({
            templateSlug: "user-welcome-email",
            to: result.user.email,
            variables: {
                first_name: result.user.firstName,
                last_name: result.user.lastName,
                onboarding_url: onboardingUrl,
                email: result.user.email,
                current_year: new Date().getFullYear().toString(),
            },
        }).catch((error) => { console.log("Welcome email sent failed", error); });

        // Slack (non-blocking)
        sendSlackNotification({
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            email: result.user.email,
            phone: result.user.phone,
            countryCode: result.user.countryCode,
        }).catch(() => { });

        return NextResponse.json({
            success: true,
            onboardingUuid: result.onboarding.uuid,
        });
    } catch (err) {
        console.error("Register error:", err);

        return NextResponse.json(
            { error: "Registration failed" },
            { status: 500 }
        );
    }
}