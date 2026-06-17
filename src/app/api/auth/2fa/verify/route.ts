// src/app/api/auth/2fa/verify/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

import speakeasy from "speakeasy";
import { z } from "zod";

const verify2FASchema = z.object({
    token: z.string().min(1, "Token is required"),
});

export async function POST(req: Request) {

    try {

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

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
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { token } = parsed.data;

        const twoFactor = await db.twoFactorMethod.findFirst({
            where: {
                userId: user.id,
                type: "APP"
            }
        });

        if (!twoFactor || !twoFactor.secret) {

            return NextResponse.json(
                {
                    success: false,
                    message: "2FA not found"
                },
                { status: 404 }
            );

        }

        const verified = speakeasy.totp.verify({
            secret: twoFactor.secret,
            encoding: "base32",
            token,
            window: 1
        });

        if (!verified) {

            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid code"
                },
                { status: 400 }
            );

        }

        await db.twoFactorMethod.update({
            where: {
                id: twoFactor.id
            },
            data: {
                enabled: true,
                verifiedAt: new Date(),
                isPrimary: true
            }
        });

        return NextResponse.json({
            success: true,
            message: "2FA enabled successfully"
        });

    } catch (error) {

        console.log(error);

        return NextResponse.json(
            {
                success: false,
                message: "Something went wrong"
            },
            { status: 500 }
        );

    }

}