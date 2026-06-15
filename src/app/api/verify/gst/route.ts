import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashfreeClient } from "@/lib/cashfree";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

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

        const { gstNumber } = await req.json();

        if (!gstNumber) {
            return NextResponse.json(
                { error: "Invalid GST number" },
                { status: 400 }
            );
        }

        const result = await cashfreeClient.verifyGST(
            gstNumber,
            user.id
        );

        const isSuccess = result.valid === true;

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
                verificationType: "gst",
                cashfreeRefId,
                verificationStatus: isSuccess ? "success" : "failed",
                extractedData: result,
                verifiedAt: isSuccess ? new Date() : null,
            },
        });

        return NextResponse.json({
            success: isSuccess,
            legalName: result.legal_name_of_business,
            tradeName: result.trade_name_of_business,
            gstStatus: result.gst_in_status,
            principalAddress: result.principal_place_address,
            splitAddress: result.principal_place_split_address,
        });

    } catch (error: any) {

        console.error("GST verify API error:", error);

        return NextResponse.json(
            { error: error.message || "GST verification failed" },
            { status: 500 }
        );

    }
}