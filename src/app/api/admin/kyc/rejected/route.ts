// src/app/api/admin/kyc/rejected/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { format } from "date-fns";

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
        // STEP 2: FETCH REJECTED KYC RECORDS
        // =============================
        const data = await db.kycRejection.findMany({
            where: { status: "rejected" },
            select: {
                id: true,
                userId: true,
                status: true,
                verifiedAt: true,
                rawResponse: true,
            },
            orderBy: {
                verifiedAt: "desc"
            }
        });

        // =============================
        // STEP 3: REMOVE DUPLICATE USERS
        // =============================
        const seenUserIds = new Set<number>();

        const uniqueData = data.filter((item) => {
            if (seenUserIds.has(item.userId)) {
                return false;
            }
            seenUserIds.add(item.userId);
            return true;
        });

        // =============================
        // STEP 4: FORMAT RESPONSE DATA
        // =============================
        const formattedData = uniqueData.map((item) => {
            const raw = (item.rawResponse as Record<string, any>) || {};

            return {
                id: String(item.id),
                userID: String(item.userId),
                firstName: raw.firstName || "",
                lastName: raw.lastName || "",
                email: raw.email || "",
                phone: raw.phone || "",
                countryCode: raw.countryCode || '',
                documentType: raw.documentType || "",
                rejectedAt: item.verifiedAt ? item.verifiedAt.toISOString().replace("T", " ").substring(0, 19) : raw.rejectedAt || "N/A",

                rawRejectedAt: item.verifiedAt ? item.verifiedAt.toISOString().replace("T", " ").substring(0, 19) : raw.rawRejectedAt || null,

                rejectedBy: raw.rejectedBy || "",

                reason: raw.reason || raw.rejectionReason || raw.rejectReason || "",

                avatar: `${(raw.firstName || "")[0] || ""}${(raw.lastName || "")[0] || ""}`.toUpperCase(),

                accountType: raw.accountType || "",

                internationalVerified: raw.internationalVerified || false,
            };
        });

        // =============================
        // STEP 5: RETURN REJECTED KYC DATA
        // =============================
        return NextResponse.json({
            success: true,
            data: formattedData
        });

    } catch (error) {
        console.error("Error fetching rejected KYC data:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}