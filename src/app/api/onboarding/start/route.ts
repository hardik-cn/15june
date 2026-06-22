import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const dbUser = await db.user.findUnique({
            where: { id: user.id },
            include: {
                onboarding: true,
            },
        });

        if (!dbUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Already completed
        if (dbUser.onboarding?.status === "completed") {
            return NextResponse.json(
                { error: "Onboarding already completed" },
                { status: 400 }
            );
        }

        // Resume onboarding
        if (dbUser.onboarding) {
            return NextResponse.json({
                onboardingUuid: dbUser.onboarding.uuid,
            });
        }

        // Create onboarding
        const onboardingUuid = uuidv4();

        const onboarding = await db.onboarding.create({
            data: {
                uuid: onboardingUuid,
                userId: dbUser.id,
                whmcsClientId: null,
                status: "pending",
                createdAt: getISTDateWithOffset(0),
                updatedAt: getISTDateWithOffset(0),
            },
        });

        return NextResponse.json({
            onboardingUuid: onboarding.uuid,
        });

    } catch (err) {
        console.error("Onboarding start error:", err);

        return NextResponse.json(
            { error: "Failed to start onboarding" },
            { status: 500 }
        );
    }
}