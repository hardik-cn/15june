// src/app/api/user/email/verify-otp/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { hashOtp, getTimeWindow } from "@/lib/security/otpGenerate";
import { logUserActivityFromRequest } from "@/lib/userActivityLog";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";
import { updateWhmcsClientEmail, updateWhmcsUserEmail } from "@/lib/whmcs/updateContact";
import { getWhmcsUserId } from "@/lib/whmcs/changePassword";

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
        const { target, email, otp } = await req.json();

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
        }

        // Verify OTP against redis
        const otpKey = `otp:email-change:${target}:${user.id}:${finalEmail}`;
        const stored = await redis.get(otpKey);

        if (!stored) {
            return NextResponse.json({ error: "OTP expired or not sent" }, { status: 400 });
        }

        const { hash, window } = JSON.parse(stored);
        const currentWindow = getTimeWindow();

        // Allow current window or previous window (5 min overlap)
        if (currentWindow !== window && currentWindow !== window + 1) {
            return NextResponse.json({ error: "OTP expired" }, { status: 400 });
        }

        const calculatedHash = hashOtp(otp, finalEmail, window);
        if (calculatedHash !== hash) {
            return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
        }

        // OTP verified successfully
        await redis.del(otpKey);

        // If target is "new", perform DB + WHMCS update
        if (target === "new") {
            const dbUser = await db.user.findUnique({
                where: { id: user.id },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    whmcsClientId: true,
                },
            });

            if (!dbUser) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const oldEmail = dbUser.email;

            // Check email uniqueness again
            const existingUser = await db.user.findUnique({
                where: { email: finalEmail },
            });
            if (existingUser && existingUser.id !== user.id) {
                return NextResponse.json(
                    { error: "Email is already in use" },
                    { status: 400 }
                );
            }

            // Update user in DB
            await updateUserWithRetry({
                where: { id: dbUser.id },
                data: {
                    email: finalEmail,
                    isEmailVerified: 1,
                },
            });

            // Log email changed
            logUserActivityFromRequest(req, {
                logAction: "EMAIL_CHANGED",
                logMessage: `Email changed for user: ${dbUser.email} -> ${finalEmail}`,
                userId: dbUser.id,
                username: `${dbUser.firstName} ${dbUser.lastName}`,
                email: finalEmail,
                status: "success",
                rawData: {
                    oldEmail,
                    newEmail: finalEmail,
                },
            });

            // Send notification to both old and new email addresses
            try {
                // To old email
                await sendTemplateEmail({
                    templateSlug: "email-changed",
                    to: oldEmail,
                    variables: {
                        first_name: dbUser.firstName,
                        old_email: oldEmail,
                        new_email: finalEmail,
                        change_time: new Date().toLocaleString(),
                        support_email: "support@cantech.in",
                        current_year: new Date().getFullYear().toString(),
                    },
                });
            } catch (err) {
                console.error("Email change notification to old email failed:", err);
            }

            try {
                // To new email
                await sendTemplateEmail({
                    templateSlug: "email-changed",
                    to: finalEmail,
                    variables: {
                        first_name: dbUser.firstName,
                        old_email: oldEmail,
                        new_email: finalEmail,
                        change_time: new Date().toLocaleString(),
                        support_email: "support@cantech.in",
                        current_year: new Date().getFullYear().toString(),
                    },
                });
            } catch (err) {
                console.error("Email change notification to new email failed:", err);
            }

            // Sync with WHMCS
            try {
                if (dbUser.whmcsClientId) {
                    await updateWhmcsClientEmail(
                        dbUser.whmcsClientId,
                        finalEmail
                    );
                }

                const whmcsUserId = await getWhmcsUserId(oldEmail);
                if (whmcsUserId) {
                    await updateWhmcsUserEmail(
                        whmcsUserId,
                        finalEmail
                    );
                }

            } catch (err) {
                console.error("WHMCS sync failed:", err);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("VERIFY EMAIL OTP ERROR:", error);
        return NextResponse.json(
            { error: error.message || "Verification failed" },
            { status: 500 }
        );
    }
}
