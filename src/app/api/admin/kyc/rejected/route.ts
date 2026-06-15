import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { format } from "date-fns";

export async function GET(request: Request) {
    try {
        const adminAuth = await getAdminFromRequest(request);
        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await db.kycRejection.findMany({
            where: { status: "rejected" },
            select: {
                id: true,
                userId: true,
                status: true,
                verifiedAt: true,
                rawResponse: true,
            },
            orderBy: { verifiedAt: "desc" },
        });

        // Deduplicate: one record per userId (first match = latest due to ordering)
        const seenUserIds = new Set<number>();
        const uniqueData = data.filter((item) => {
            if (seenUserIds.has(item.userId)) return false;
            seenUserIds.add(item.userId);
            return true;
        });

        const formattedData = uniqueData.map((item) => {
            const raw = (item.rawResponse as Record<string, any>) || {};
            return {
                id: String(item.id),
                userID: String(item.userId),
                firstName: raw.firstName || "",
                lastName: raw.lastName || "",
                email: raw.email || "",
                phone: raw.phone || "",
                documentType: raw.documentType || "",
                rejectedAt: item.verifiedAt
                    ? format(item.verifiedAt, "dd MMM yyyy, h:mm:ss a")
                    : raw.rejectedAt || "N/A",
                rawRejectedAt: item.verifiedAt
                    ? item.verifiedAt.toISOString()
                    : raw.rawRejectedAt || null,
                rejectedBy: raw.rejectedBy || "",
                reason: raw.reason || raw.rejectionReason || raw.rejectReason || "",
                avatar: `${(raw.firstName || "")[0] || ""}${(raw.lastName || "")[0] || ""}`.toUpperCase(),
                accountType: raw.accountType || "",
                internationalVerified: raw.internationalVerified || false,
            };
        });

        return NextResponse.json({
            success: true,
            data: formattedData,
        });
    } catch (error) {
        console.error("Error fetching rejected KYC data:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
