// src/app/api/auth/2fa/verify/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

import speakeasy from "speakeasy";

export async function POST(req: Request) {

    try {

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();

        const { token } = body;

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