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