// src/app/api/user/onboarding-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
    try {

        // =====================================
        // GET ACCESS TOKEN
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
        // VERIFY TOKEN
        // =====================================
        const payload = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!
        ) as { userId: number };

        // =====================================
        // FETCH USER + RELATIONS
        // =====================================
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                onboarding: true,
                kycProfile: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }
        // =====================================
        // RESPONSE
        // =====================================
        const responsePayload = {
            onboardingStatus: user.onboarding?.status ?? null,
            onboardingUuid: user.onboarding?.uuid ?? null,
            kycStatus: user.kycProfile?.status ?? null,
        };
        return NextResponse.json(responsePayload);

    } catch (error) {

        return NextResponse.json(
            { error: "Invalid or expired token" },
            { status: 401 }
        );

    }
}