// src/app/api/verify/digilocker/initiate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashfreeClient } from "@/lib/cashfree";
import crypto from "crypto";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function POST(req: NextRequest) {
    try {
        // Authenticate user via JWT
        const user = await getUserFromRequest(req);

        if (!user) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

        // Get onboarding ID from request body (optional)
        const body = await req.json().catch(() => ({}));
        const onboardingId = body.onboardingId;

        let redirectUrl = "https://app.cantech.network/onboarding/digilocker/callback";

        if (onboardingId) {
            redirectUrl += `?onboarding_id=${onboardingId}`;
        }

        /*
        ─────────────────────────────────────
        Check if already verified
        ─────────────────────────────────────
        */
        const existingVerification = await db.verificationDocument.findFirst({
            where: {
                userId: user.id,
                verificationType: "digilocker",
                verificationStatus: "success",
                attemptStatus: {
                    not: "rejected",
                },
            },
        });

        if (existingVerification) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Already verified with DigiLocker",
                },
                { status: 400 }
            );
        }

        /*
        ─────────────────────────────────────
        Initiate DigiLocker with Cashfree
        ─────────────────────────────────────
        */
        const verificationResult = await cashfreeClient.initiateDigiLocker(user.id, onboardingId);

        /*
        ─────────────────────────────────────
        Store verification attempt
        ─────────────────────────────────────
        */

        const secureToken = crypto.randomBytes(32).toString("hex");

        await db.verificationDocument.create({
            data: {
                userId: user.id,
                verificationType: "digilocker",
                cashfreeRefId: verificationResult.verification_id,
                verificationToken: secureToken,
                verificationTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
                verificationStatus: "pending",
                rawResponse: verificationResult as any,
            },
        });

        console.log("DigiLocker verification created:", {
            userId: user.id,
            verificationId: verificationResult.verification_id,
        });

        return NextResponse.json({
            success: true,
            url: verificationResult.url,
            verificationId: verificationResult.verification_id,
            token: secureToken,
        });

    } catch (error: any) {

        console.error("DigiLocker initiate API error:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to initiate DigiLocker verification",
            },
            { status: 500 }
        );

    }
}