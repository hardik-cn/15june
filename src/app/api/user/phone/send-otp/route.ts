// src/app/api/user/phone/send-otp/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendOtp } from "@/lib/otp";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function POST(req: Request) {
    try {
        const { target, phone, countryCode } = await req.json();

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 24-hour limit check
        const lastPhoneChange = await db.userActivityLog.findFirst({
            where: {
                userId: user.id,
                logAction: "PHONE_NUMBER_CHANGED",
                status: "success",
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
            },
            orderBy: { createdAt: "desc" }
        });
        if (lastPhoneChange) {
            const timeLeftMs = lastPhoneChange.createdAt.getTime() + 24 * 60 * 60 * 1000 - Date.now();
            const hours = Math.floor(timeLeftMs / (3600 * 1000));
            const minutes = Math.ceil((timeLeftMs % (3600 * 1000)) / (60 * 1000));
            const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            return NextResponse.json(
                { error: `You can only change your mobile number once every 24 hours. Please try again in ${timeString}.` },
                { status: 400 }
            );
        }

        let finalPhone = "";

        if (target === "existing") {
            // Fetch from DB
            const dbUser = await db.user.findUnique({
                where: { id: user.id },
                select: { phone: true, countryCode: true },
            });

            if (!dbUser || !dbUser.phone) {
                return NextResponse.json(
                    { error: "User phone not found" },
                    { status: 400 }
                );
            }

            finalPhone = `${dbUser.countryCode}${dbUser.phone}`;
        } else {
            finalPhone = `${countryCode}${phone}`;
        }

        await sendOtp(finalPhone);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to send OTP" },
            { status: 500 }
        );
    }
}