// src/app/api/admin/kyc/approved/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(request: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(request);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: FETCH APPROVED KYC RECORDS
        // =============================
        const kycProfiles = await db.kycProfile.findMany({
            where: { status: "approved" },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        firstName: true,
                        lastName: true,
                        countryCode: true,
                    },
                },
            },
            orderBy: {
                approvedAt: "desc",
            },
        });

        // =============================
        // STEP 3: FORMAT KYC RECORDS
        // =============================
        const formattedRecords = kycProfiles.map((profile) => {
            return {
                id: profile.id,
                userId: profile.userId,
                accountType: profile.accountType || "N/A",
                firstName: profile.user?.firstName || "",
                lastName: profile.user?.lastName || "",
                email: profile.user?.email || "",
                phone: profile.user?.phone || "",
                countryCode: profile.user?.countryCode || "",
                createdAt: profile.createdAt ? profile.createdAt.toISOString() : null,
                status: profile.status,
                approvedAt: profile.approvedAt ? profile.approvedAt.toISOString().replace("T", " ").substring(0, 19) : null,
                approvedBy: profile.approvedBy || null,
                internationalVerified: profile.internationalVerified || false,
                submittedAt: profile.createdAt ? profile.createdAt.toISOString().replace("T", " ").substring(0, 16) : "",
                avatar: `${profile.user?.firstName?.charAt(0) || ""}${profile.user?.lastName?.charAt(0) || ""}`.toUpperCase(),
            };
        });

        // =============================
        // STEP 4: RETURN RESPONSE DATA
        // =============================
        return NextResponse.json({
            success: true,
            data: formattedRecords,
            total: formattedRecords.length
        });

    } catch (error) {
        console.error("Error fetching approved KYC records:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch approved KYC records" }, { status: 500 });
    }
}
