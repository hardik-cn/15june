// src/app/api/verify/digilocker/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db.verificationDocument.updateMany({
            where: {
                userId: user.id,
                verificationType: "digilocker",
            },
            data: {
                attemptStatus: "rejected",
            },
        });

        await db.kycProfile.updateMany({
            where: { userId: user.id },
            data: {
                aadharVerified: false,
                streetAddress: "",
                city: "",
                state: "",
                postalCode: "",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DigiLocker reset error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to reset" },
            { status: 500 }
        );
    }
}