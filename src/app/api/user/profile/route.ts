// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { db } from "@/lib/db";
import { logUserActivityFromRequest } from "@/lib/userActivityLog";
import { updateWhmcsClientEmail, updateWhmcsUserEmail, updateWhmcsClientPhone } from "@/lib/whmcs/updateContact";
import { getWhmcsUserId } from "@/lib/whmcs/changePassword";
import { dialCodeToISO } from "@/lib/countries";

export async function GET(req: Request) {
    try {
        const authUser = await getUserFromRequest(req);
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: authUser.id },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                isEmailVerified: true,
                phone: true,
                countryCode: true,
                isPhoneVerified: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch last changes to compute cooldown locks
        const lastPhoneChange = await db.userActivityLog.findFirst({
            where: {
                userId: authUser.id,
                logAction: "PHONE_NUMBER_CHANGED",
                status: "success",
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });

        const lastEmailChange = await db.userActivityLog.findFirst({
            where: {
                userId: authUser.id,
                logAction: "EMAIL_CHANGED",
                status: "success",
            },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });

        const nextPhoneChangeAt = lastPhoneChange
            ? new Date(lastPhoneChange.createdAt.getTime() + 24 * 60 * 60 * 1000)
            : null;

        const nextEmailChangeAt = lastEmailChange
            ? new Date(lastEmailChange.createdAt.getTime() + 24 * 60 * 60 * 1000)
            : null;

        return NextResponse.json({
            ...user,
            nextPhoneChangeAt,
            nextEmailChangeAt,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const authUser = await getUserFromRequest(req);
        if (!authUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { firstName, lastName, email, phone, countryCode } = body;

        const current = await db.user.findUnique({ where: { id: authUser.id } });
        if (!current) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const isEmailChanged = email && email !== current.email;
        const isPhoneChanged = (phone && phone !== current.phone) || (countryCode && countryCode !== current.countryCode);

        if (isEmailChanged) {
            const lastEmailChange = await db.userActivityLog.findFirst({
                where: {
                    userId: authUser.id,
                    logAction: "EMAIL_CHANGED",
                    status: "success",
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: { createdAt: "desc" }
            });
            if (lastEmailChange) {
                return NextResponse.json({ error: "You can only change your email address once every 24 hours." }, { status: 400 });
            }

            const existing = await db.user.findUnique({ where: { email } });
            if (existing && existing.id !== authUser.id) {
                return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
            }
        }

        if (isPhoneChanged) {
            const lastPhoneChange = await db.userActivityLog.findFirst({
                where: {
                    userId: authUser.id,
                    logAction: "PHONE_NUMBER_CHANGED",
                    status: "success",
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                },
                orderBy: { createdAt: "desc" }
            });
            if (lastPhoneChange) {
                return NextResponse.json({ error: "You can only change your mobile number once every 24 hours." }, { status: 400 });
            }
        }

        const updated = await db.user.update({
            where: { id: authUser.id },
            data: {
                firstName: firstName ?? current.firstName,
                lastName: lastName ?? current.lastName,
                email: email ?? current.email,
                phone: phone ?? current.phone,
                countryCode: countryCode ?? current.countryCode,
                ...(isEmailChanged && { isEmailVerified: null }),
                ...(isPhoneChanged && { isPhoneVerified: null }),
            }
        });

        // Log email change
        if (isEmailChanged) {
            logUserActivityFromRequest(req, {
                logAction: "EMAIL_CHANGED",
                logMessage: `Email changed for user ID ${authUser.id}`,
                userId: authUser.id,
                username: `${current.firstName} ${current.lastName}`,
                email: email,
                status: "success",
                rawData: {
                    oldEmail: current.email,
                    newEmail: email,
                },
            });
        }

        // Log phone change
        if (isPhoneChanged) {
            logUserActivityFromRequest(req, {
                logAction: "PHONE_NUMBER_CHANGED",
                logMessage: `Phone number changed for user ID ${authUser.id}`,
                userId: authUser.id,
                username: `${current.firstName} ${current.lastName}`,
                email: current.email,
                status: "success",
                rawData: {
                    oldPhone: `${current.countryCode}${current.phone}`,
                    newPhone: `${countryCode ?? current.countryCode}${phone ?? current.phone}`,
                },
            });
        }
        // Sync with WHMCS
        if (isEmailChanged && current.whmcsClientId) {
            try {
                await updateWhmcsClientEmail(current.whmcsClientId, email);
                const whmcsUserId = await getWhmcsUserId(current.email);
                if (whmcsUserId) {
                    await updateWhmcsUserEmail(whmcsUserId, email);
                }
            } catch (err) {
                console.error("WHMCS email sync failed during profile PUT:", err);
            }
        }
        if (isPhoneChanged && current.whmcsClientId) {
            try {
                const whmcsCountryCode = dialCodeToISO(countryCode ?? current.countryCode);
                const finalPhone = `${countryCode ?? current.countryCode}${phone ?? current.phone}`;
                await updateWhmcsClientPhone(current.whmcsClientId, finalPhone, whmcsCountryCode);
            } catch (err) {
                console.error("WHMCS phone sync failed during profile PUT:", err);
            }
        }
        return NextResponse.json({ success: true, user: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
