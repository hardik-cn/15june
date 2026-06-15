import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
    try {

        const authHeader = req.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json(
                { allowed: false },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];

        const payload = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!
        ) as { userId: number };

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                onboarding: true,
                kycProfile: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { allowed: false },
                { status: 401 }
            );
        }

        const onboardingStatus =
            user.onboarding?.status
                ?.toLowerCase()
                ?.trim();

        const kycStatus =
            user.kycProfile?.status
                ?.toLowerCase()
                ?.trim();

        // =========================
        // FULL ACCESS
        // =========================

        if (
            onboardingStatus === "completed" &&
            kycStatus === "approved"
        ) {
            return NextResponse.json({
                allowed: true
            });
        }


        // =========================
        // REVIEW MODE
        // =========================

        if (kycStatus === "pending") {
            return NextResponse.json({
                allowed: false,
                redirect: "/dashboard?showKycPopup=review"
            });
        }

        // =========================
        // REQUIRE KYC
        // =========================

        return NextResponse.json({
            allowed: false,
            redirect: "/dashboard?showKycPopup=required"
        });

    } catch (error) {

        console.error(
            "VERIFY ACCESS ERROR:",
            error
        );
    }
}