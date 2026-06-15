// app/api/verify/didit/status/route.ts
//
// Polled by the client to check the current status of a Didit session.
// Returns flat fields at the top level so KYCValidation.tsx polling can
// read data.status, data.addressStreet, data.addressCity, etc. directly.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function GET(req: NextRequest) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ── Query param ───────────────────────────────────────────────────────
        const { searchParams } = new URL(req.url);
        const diditSessionId = searchParams.get("sessionId");

        if (!diditSessionId) {
            return NextResponse.json(
                { error: "sessionId query param is required" },
                { status: 400 }
            );
        }

        // ── Fetch from DB ─────────────────────────────────────────────────────
        const record = await db.diditSession.findFirst({
            where: {
                sessionId: diditSessionId,
                userId: user.id,          // ensure the session belongs to this user
            },
            select: {
                status: true,
                // Address fields (flat – used directly by the polling handler)
                addressStreet: true,
                addressStreet2: true,
                addressCity: true,
                addressState: true,
                addressPostalCode: true,
                addressCountry: true,
                // Document / identity fields
                firstName: true,
                lastName: true,
                documentType: true,
                documentNumber: true,
                nationality: true,
                dateOfBirth: true,
            },
        });

        if (!record) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        // Return flat – matches what KYCValidation.tsx polling handler expects:
        //   data.status, data.addressStreet, data.addressCity, etc.
        return NextResponse.json({
            success: true,
            // Verification status
            status: record.status,
            // Address (flat)
            addressStreet: record.addressStreet,
            addressStreet2: record.addressStreet2,
            addressCity: record.addressCity,
            addressState: record.addressState,
            addressPostalCode: record.addressPostalCode,
            addressCountry: record.addressCountry,
            // Identity
            firstName: record.firstName,
            lastName: record.lastName,
            documentType: record.documentType,
            documentNumber: record.documentNumber,
            nationality: record.nationality,
            dateOfBirth: record.dateOfBirth,
        });
    } catch (error: any) {
        // console.error("[didit/status]", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "Failed to fetch status",
            },
            { status: 500 }
        );
    }
}