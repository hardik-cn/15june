// src/app/api/auth/login/setup-app/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import QRCode from "qrcode";
import speakeasy from "speakeasy";
import { setupAppSchema } from "@/lib/validators/setupAppSchema";

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

        const parsed = setupAppSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input" },
                { status: 400 }
            );
        }

        const { tempToken } = parsed.data;

        if (!tempToken) {
            return NextResponse.json(
                { message: "Missing token" },
                { status: 400 }
            );
        }

        let payload: any;

        try {

            payload = jwt.verify(
                tempToken,
                process.env.ACCESS_TOKEN_SECRET!
            );

            if (payload.purpose !== "2fa-setup") {
                throw new Error("Invalid purpose");
            }

        } catch {

            return NextResponse.json(
                { message: "Invalid token" },
                { status: 401 }
            );

        }

        const user = await db.user.findUnique({
            where: {
                id: payload.userId
            }
        });

        if (!user) {

            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );

        }

        const appMethod = await db.twoFactorMethod.findFirst({
            where: {
                userId: user.id,
                type: "APP"
            }
        });

        if (!appMethod || !appMethod.secret) {

            return NextResponse.json(
                { message: "Authenticator setup not found" },
                { status: 404 }
            );

        }

        const otpauthUrl = speakeasy.otpauthURL({
            secret: appMethod.secret,
            label: `Cantech (${user.email})`,
            issuer: "Cantech",
            encoding: "base32"
        });

        const qrCode = await QRCode.toDataURL(
            otpauthUrl
        );

        return NextResponse.json({
            success: true,
            qrCode
        });

    } catch (error) {

        console.log(error);

        return NextResponse.json(
            { message: "Something went wrong" },
            { status: 500 }
        );

    }

}