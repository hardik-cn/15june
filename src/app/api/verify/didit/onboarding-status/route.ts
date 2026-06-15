// app/api/verify/didit/onboarding-status/route.ts
//
// Returns the most recent Didit verification status for a given onboarding ID.
// Called on page mount so the client never has to read from localStorage.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const onboardingId = searchParams.get("onboardingId");

        if (!onboardingId) {
            return NextResponse.json(
                { error: "onboardingId is required" },
                { status: 400 }
            );
        }

        // Find the most recently updated Didit session for this user + onboarding
        const record = await db.diditSession.findFirst({
            where: {
                userId: user.id,
                vendorData: { contains: `onboarding:${onboardingId}` },
            },
            orderBy: { updatedAt: "desc" },
            select: { status: true },
        });

        // No session yet = Not Started
        const status = record?.status ?? "Not Started";

        return NextResponse.json({ status });
    } catch (err: any) {
        console.error("[didit/onboarding-status]", err);
        return NextResponse.json(
            { error: err.message || "Failed to fetch status" },
            { status: 500 }
        );
    }
}