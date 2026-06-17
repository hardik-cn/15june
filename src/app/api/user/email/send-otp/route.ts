// src/app/api/user/email/send-otp/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { generateOtp, hashOtp, getTimeWindow } from "@/lib/security/otpGenerate";
import { sendEmailOtp } from "@/emails/sendEmailOtp";

export async function POST(req: Request) {
    try {
        const { target, email } = await req.json();

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 24-hour limit check
        const lastEmailChange = await db.userActivityLog.findFirst({
            where: {
                userId: user.id,
                logAction: "EMAIL_CHANGED",
                status: "success",
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            },
            orderBy: { createdAt: "desc" }
        });
        if (lastEmailChange) {
            const timeLeftMs = lastEmailChange.createdAt.getTime() + 24 * 60 * 60 * 1000 - Date.now();
            const hours = Math.floor(timeLeftMs / (3600 * 1000));
            const minutes = Math.ceil((timeLeftMs % (3600 * 1000)) / (60 * 1000));
            const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            return NextResponse.json(
                { error: `You can only change your email address once every 24 hours. Please try again in ${timeString}.` },
                { status: 400 }
            );
        }

        let finalEmail = "";

        if (target === "existing") {
            const dbUser = await db.user.findUnique({
                where: { id: user.id },
                select: { email: true },
            });

            if (!dbUser || !dbUser.email) {
                return NextResponse.json(
                    { error: "User email not found" },
                    { status: 400 }
                );
            }

            finalEmail = dbUser.email;
        } else {
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return NextResponse.json(
                    { error: "Please enter a valid email address." },
                    { status: 400 }
                );
            }
            finalEmail = email.toLowerCase().trim();

            // Check if new email is already taken
            const existingUser = await db.user.findUnique({
                where: { email: finalEmail },
            });
            if (existingUser && existingUser.id !== user.id) {
                return NextResponse.json(
                    { error: "Email is already in use" },
                    { status: 400 }
                );
            }
        }

        // Generate OTP
        const otp = generateOtp();
        const window = getTimeWindow();
        const hashed = hashOtp(otp, finalEmail, window);

        // Store OTP in redis
        const otpKey = `otp:email-change:${target}:${user.id}:${finalEmail}`;
        await redis.set(otpKey, JSON.stringify({ hash: hashed, window }), "EX", 300);

        // Send Email
        await sendEmailOtp(finalEmail, otp);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("EMAIL CHANGE SEND OTP ERROR:", error);
        return NextResponse.json(
            { error: error.message || "Failed to send OTP" },
            { status: 500 }
        );
    }
}
