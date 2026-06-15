// src/app/api/auth/2fa/setup/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import speakeasy from "speakeasy";
import { z } from "zod";

export const setup2FASchema = z.object({
    smsEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    appEnabled: z.boolean(),
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

        const parsed = setup2FASchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid input",
                    details: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const {
            smsEnabled,
            emailEnabled,
            appEnabled,
        } = parsed.data;

        const responseData: any = {};

        /*
        |--------------------------------------------------------------------------
        | EMAIL 2FA
        |--------------------------------------------------------------------------
        */

        const existingEmail = await db.twoFactorMethod.findFirst({
            where: {
                userId: user.id,
                type: "EMAIL"
            }
        });

        if (emailEnabled) {

            if (!existingEmail) {

                await db.twoFactorMethod.create({
                    data: {
                        userId: user.id,
                        type: "EMAIL",
                        enabled: true,
                        email: user.email,
                        verifiedAt: new Date()
                    }
                });

            }

        } else {

            if (existingEmail) {

                await db.twoFactorMethod.delete({
                    where: {
                        id: existingEmail.id
                    }
                });

            }

        }

        /*
        |--------------------------------------------------------------------------
        | SMS 2FA
        |--------------------------------------------------------------------------
        */

        const existingSMS = await db.twoFactorMethod.findFirst({
            where: {
                userId: user.id,
                type: "SMS"
            }
        });

        if (smsEnabled) {

            if (!existingSMS) {

                await db.twoFactorMethod.create({
                    data: {
                        userId: user.id,
                        type: "SMS",
                        enabled: true,
                        phoneNumber: user.phone,
                        verifiedAt: new Date()
                    }
                });

            }

        } else {

            if (existingSMS) {

                await db.twoFactorMethod.delete({
                    where: {
                        id: existingSMS.id
                    }
                });

            }

        }

        /*
        |--------------------------------------------------------------------------
        | APP AUTHENTICATOR
        |--------------------------------------------------------------------------
        */

        const existingApp = await db.twoFactorMethod.findFirst({
            where: {
                userId: user.id,
                type: "APP"
            }
        });

        if (appEnabled) {

            if (!existingApp) {

                const secret = speakeasy.generateSecret({
                    name: `Cantech (${user.email})`
                });

                await db.twoFactorMethod.create({
                    data: {
                        userId: user.id,
                        type: "APP",
                        enabled: false,
                        secret: secret.base32
                    }
                });

            }

        } else {

            if (existingApp) {

                await db.twoFactorMethod.delete({
                    where: {
                        id: existingApp.id
                    }
                });

                await db.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        twoFactorType: null
                    }
                });

            }

        }

        return NextResponse.json({
            success: true
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

export async function GET(req: Request) {

    try {

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const methods = await db.twoFactorMethod.findMany({
            where: {
                userId: user.id
            }
        });

        return NextResponse.json({
            smsEnabled: methods.some(
                method => method.type === "SMS"
            ),

            emailEnabled: methods.some(
                method => method.type === "EMAIL"
            ),

            appEnabled: methods.some(
                method => method.type === "APP"
            )
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