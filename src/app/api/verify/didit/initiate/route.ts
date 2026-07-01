// app/api/verify/didit/initiate/route.ts
//
// Creates a new Didit verification session for the authenticated user.
// The client opens the returned `url` in a popup.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createDiditSession } from "@/lib/didit";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function POST(req: NextRequest) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ── Request body ──────────────────────────────────────────────────────
        const body = await req.json().catch(() => ({}));
        const onboardingId: string | undefined = body.onboardingId;

        // The full name entered by the user ("as per document")
        const expectedFullName: string | undefined = body.expectedName?.trim();

        if (!onboardingId) {
            return NextResponse.json(
                { error: "onboardingId is required" },
                { status: 400 }
            );
        }

        if (!expectedFullName) {
            return NextResponse.json(
                { error: "expectedName (full name as per document) is required" },
                { status: 400 }
            );
        }

        // ── Create Didit session ──────────────────────────────────────────────
        // createDiditSession will split expectedFullName into first + last name
        // and pass them as expected_details.first_name / last_name to Didit.
        const diditSession = await createDiditSession({
            vendorData: `onboarding:${onboardingId}:user:${user.id}`,
            callbackPath: "/api/verify/didit/callback",
            email: user.email ?? undefined,
            expectedDetails: {
                name: expectedFullName,
            },
        });

        // ── Persist session record ────────────────────────────────────────────
        await db.diditSession.create({
            data: {
                sessionId: diditSession.session_id,
                sessionNumber: diditSession.session_number ?? null,
                sessionToken: diditSession.session_token ?? null,
                verificationUrl: diditSession.url,
                vendorData: diditSession.vendor_data ?? null,
                status: diditSession.status ?? "Not Started",
                userId: user.id,
                rawSessionResponse: diditSession as any,
                createdAt: getISTDateWithOffset(0),
                updatedAt: getISTDateWithOffset(0),
            },
        });

        return NextResponse.json({
            success: true,
            url: diditSession.url,
            sessionId: diditSession.session_id,
        });
    } catch (err: any) {
        // console.error("[didit/initiate]", err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || "Failed to initiate verification",
            },
            { status: 500 }
        );
    }
}