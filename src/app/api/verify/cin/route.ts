import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashfreeClient } from "@/lib/cashfree";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function POST(req: Request) {
    try {

        // Authenticate using access token
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { cinNumber } = await req.json();

        if (!cinNumber || cinNumber.length !== 21) {
            return NextResponse.json(
                { error: "Invalid CIN number" },
                { status: 400 }
            );
        }

        // Call Cashfree verification
        const result = await cashfreeClient.verifyCIN(
            cinNumber,
            user.id
        );

        // CIN uses status field
        const isSuccess = result.status === "VALID";

        const cashfreeRefId = result.verification_id;

        /*
        ─────────────────────────────────────
        Save verification audit
        ─────────────────────────────────────
        */

        await db.verificationDocument.upsert({
            where: { cashfreeRefId },

            update: {
                verificationStatus: isSuccess ? "success" : "failed",
                extractedData: result,
                verifiedAt: isSuccess ? new Date() : null,
            },

            create: {
                userId: user.id,
                verificationType: "cin",
                cashfreeRefId,
                verificationStatus: isSuccess ? "success" : "failed",
                extractedData: result,
                verifiedAt: isSuccess ? new Date() : null,
            },
        });

        return NextResponse.json({
            success: isSuccess,
            companyName: result.company_name,
            companyStatus: result.company_status,
            message: result.message,
        });

    } catch (error: any) {

        console.error("CIN verify API error:", error);

        return NextResponse.json(
            { error: error.message || "CIN verification failed" },
            { status: 500 }
        );

    }
}