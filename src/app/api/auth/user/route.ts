// src/app/api/auth/user/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        // =====================================
        // GET AUTH HEADER
        // =====================================
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];

        // =====================================
        // VERIFY ACCESS TOKEN
        // =====================================
        const payload = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!
        ) as { userId: number };

        // =====================================
        // FETCH USER
        // =====================================
        const user = await db.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                countryCode: true,
                phone: true,
                email: true,
                isPhoneVerified: true,
                isEmailVerified: true,
                whmcsClientId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        return NextResponse.json(user);

    } catch (error) {

        return NextResponse.json(
            { error: "Invalid or expired token" },
            { status: 401 }
        );

    }
}