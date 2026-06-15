// src/app/api/auth/login/verify-2fa/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import speakeasy from "speakeasy";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { detectDevice } from "@/lib/auth/device";
import { z } from "zod";

export const verify2FASchema = z.object({
    tempToken: z.string().min(1),

    code: z.string()
        .trim()
        .regex(/^\d{6}$/, "Invalid verification code"),

    method: z.enum([
        "APP",
        "SMS",
        "EMAIL"
    ])
});

export async function POST(req: Request) {

    try {

        let body;

        try {
            body = await req.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON payload" },
                { status: 400 }
            );
        }

        const parsed = verify2FASchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid input",
                    details: parsed.error.flatten()
                },
                { status: 400 }
            );
        }

        const { tempToken, code, method } = parsed.data;

        if (!tempToken || !code || !method) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        // =============================
        // VERIFY TEMP TOKEN
        // =============================

        interface TwoFactorPayload {
            userId: number;
            purpose: "2fa" | "2fa-setup";
        }

        let payload: TwoFactorPayload;
        try {
            payload = jwt.verify(
                tempToken,
                process.env.ACCESS_TOKEN_SECRET!
            ) as TwoFactorPayload;
            // console.log(payload);

            if (
                payload.purpose !== "2fa" &&
                payload.purpose !== "2fa-setup"
            ) {
                throw new Error("Invalid token purpose");
            }
        } catch (err) {
            return NextResponse.json(
                { message: "Invalid or expired session" },
                { status: 401 }
            );
        }

        const userId = payload.userId;

        const user = await db.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // =============================
        // VERIFY CODE BASED ON METHOD
        // =============================

        const twoFactor = await db.twoFactorMethod.findFirst({
            where: {
                userId: user.id,
                type: method,
            },
        });

        if (!twoFactor) {
            return NextResponse.json(
                {
                    message: "Verification method not found",
                },
                {
                    status: 404,
                }
            );
        }

        // =============================
        // VERIFY OTP FIRST
        // =============================

        if (method === "APP") {

            const verified = speakeasy.totp.verify({
                secret: twoFactor.secret!,
                encoding: "base32",
                token: code,
                window: 1,
            });

            if (!verified) {
                return NextResponse.json(
                    {
                        message: "Invalid authentication code",
                    },
                    {
                        status: 400,
                    }
                );
            }

        } else if (method === "SMS") {

            const verifyRes = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL}/api/otp/phone/verify`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone: `${user.countryCode}${user.phone}`,
                        otp: code,
                    }),
                }
            );

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
                return NextResponse.json(
                    {
                        message:
                            verifyData.error ||
                            "Invalid verification code",
                    },
                    {
                        status: 400,
                    }
                );
            }

        } else if (method === "EMAIL") {

            // Future implementation

        }

        // =============================
        // OTP VERIFIED - ENABLE METHOD
        // =============================

        await db.$transaction(async (tx) => {

            await tx.twoFactorMethod.updateMany({
                where: {
                    userId: user.id,
                },
                data: {
                    isPrimary: false,
                },
            });

            await tx.twoFactorMethod.update({
                where: {
                    id: twoFactor.id,
                },
                data: {
                    enabled: true,
                    verifiedAt: new Date(),
                    isPrimary: true,
                },
            });

            await tx.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    twoFactorType: method,
                },
            });

        });

        // =============================
        // SUCCESS - ISSUE FINAL TOKENS
        // =============================

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0] ||
            "unknown";
        const userAgent =
            req.headers.get("user-agent") || "unknown";
        const device = detectDevice(userAgent);

        const accessToken = createAccessToken(user.id);
        const refreshToken = createRefreshToken(user.id);

        const refreshHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        await db.session.create({
            data: {
                id: uuidv4(),
                userId: user.id,
                refreshHash,
                deviceName: device,
                userAgent,
                ipAddress: ip,
                expiresAt: new Date(
                    Date.now() + 1000 * 60 * 60 * 24 * 30
                )
            }
        });

        const res = NextResponse.json({
            success: true,
            accessToken
        });

        res.cookies.set("refresh_token", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 30
        });

        return res;

    } catch (error) {

        console.error("2FA Verification error:", error);

        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );

    }

}
