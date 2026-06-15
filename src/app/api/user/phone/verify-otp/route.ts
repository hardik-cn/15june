// src/app/api/user/phone/verify-otp/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { updateWhmcsClientPhone } from "@/lib/whmcs/updateContact";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";
import { logUserActivityFromRequest } from "@/lib/userActivityLog";

// Retry helper for Prisma
async function updateUserWithRetry(data: any, retries = 2): Promise<any> {
    try {
        return await db.user.update(data);
    } catch (error: any) {
        if (retries > 0 && error.code === "P1017") {
            console.warn("Retrying DB update...");
            return updateUserWithRetry(data, retries - 1);
        }
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        const { target, phone, countryCode, otp } = await req.json();

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let finalPhone = "";

        if (target === "existing") {
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

        // VERIFY OTP (DIRECT CALL)
        await verifyOtp(finalPhone, otp);

        // ONLY STEP 3 → UPDATE DB + WHMCS
        if (target === "new") {
            const dbUser = await db.user.findUnique({
                where: { id: user.id },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    countryCode: true,
                    whmcsClientId: true,
                },
            });

            if (!dbUser) {
                return NextResponse.json(
                    { error: "User not found" },
                    { status: 404 }
                );
            }

            const cleanPhoneVal = (phone || "").replace(/[^0-9]/g, "");
            const cleanCodeVal = (countryCode || "91").replace("+", "");
            const finalPhone = `+${cleanCodeVal}.${cleanPhoneVal}`;

            const oldPhone = `${dbUser.countryCode}${dbUser.phone}`;

            // Update DB
            await updateUserWithRetry({
                where: { id: dbUser.id },
                data: {
                    phone,
                    countryCode,
                    isPhoneVerified: 1,
                },
            });

            // Log phone number change
            logUserActivityFromRequest(req, {
                logAction: "PHONE_NUMBER_CHANGED",
                logMessage: `Phone number changed for user: ${dbUser.email}`,
                userId: dbUser.id,
                username: `${dbUser.firstName} ${dbUser.lastName}`,
                email: dbUser.email,
                status: "success",
                rawData: {
                    oldPhone,
                    newPhone: `${countryCode}${phone}`,
                },
            });

            try {
                await sendTemplateEmail({
                    templateSlug: "phone-number-changed",
                    to: dbUser.email,
                    variables: {
                        first_name: dbUser.firstName,
                        old_phone: oldPhone,
                        new_phone: `${countryCode}${phone}`,
                        change_time: new Date().toLocaleString(),
                        support_email: "support@cantech.in",
                        current_year: new Date().getFullYear().toString(),
                    },
                });
            } catch (err) {
                console.error("Phone change notification failed:", err);
            }

            // Update WHMCS
            try {
                if (dbUser.whmcsClientId) {
                    await updateWhmcsClientPhone(
                        dbUser.whmcsClientId,
                        finalPhone,
                        countryCode
                    );
                }
            } catch (err) {
                console.error("WHMCS sync failed:", err);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("VERIFY OTP ERROR:", error);

        return NextResponse.json(
            { error: error.message || "Verification failed" },
            { status: 500 }
        );
    }
}