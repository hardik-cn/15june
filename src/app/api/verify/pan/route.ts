import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashfreeClient } from "@/lib/cashfree";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function POST(req: Request) {
    try {

        // Authenticate via JWT
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { panNumber } = await req.json();

        if (!panNumber || panNumber.length !== 10) {
            return NextResponse.json(
                { error: "Invalid PAN number" },
                { status: 400 }
            );
        }

        // STEP 1 — Call Cashfree
        const result = await cashfreeClient.verifyPAN(panNumber);

        const isSuccess = result.valid === true;

        const cashfreeRefId = String(result.reference_id);

        /*
        ─────────────────────────────────────
        Save verification log
        ─────────────────────────────────────
        */
        await db.verificationDocument.upsert({
            where: { cashfreeRefId },

            update: {
                verificationStatus: isSuccess ? "success" : "failed",
                extractedData: result,
                verifiedAt: isSuccess ? getISTDateWithOffset(0) : null,
                updatedAt: getISTDateWithOffset(0),
            },

            create: {
                userId: user.id,
                verificationType: "pan",
                cashfreeRefId,
                verificationStatus: isSuccess ? "success" : "failed",
                extractedData: result,
                verifiedAt: isSuccess ? getISTDateWithOffset(0) : null,
                createdAt: getISTDateWithOffset(0),
                updatedAt: getISTDateWithOffset(0),
            },
        });

        // STEP 3 — Return result

        return NextResponse.json({
            success: isSuccess,
            name: result.registered_name,
            type: result.type,
            message: result.message,
        });

    } catch (error: any) {

        console.error("PAN verify API error:", error);

        return NextResponse.json(
            { error: error.message || "PAN verification failed" },
            { status: 500 }
        );

    }
}