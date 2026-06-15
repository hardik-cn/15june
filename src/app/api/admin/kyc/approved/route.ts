import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(request: Request) {
    try {
        const adminAuth = await getAdminFromRequest(request);
        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
                    }
                }
            },
            orderBy: {
                approvedAt: "desc",
            },
        });

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
                approvedAt: profile.approvedAt ? profile.approvedAt.toISOString() : null,
                approvedBy: profile.approvedBy || null,
                internationalVerified: profile.internationalVerified || false,
                submittedAt: profile.createdAt
                    ? profile.createdAt.toISOString().replace("T", " ").substring(0, 16)
                    : "",
                avatar: `${profile.user?.firstName?.charAt(0) || ""}${profile.user?.lastName?.charAt(0) || ""}`.toUpperCase(),
            };
        });

        return NextResponse.json({
            success: true,
            data: formattedRecords,
            total: formattedRecords.length,
        });
    } catch (error) {
        console.error("Error fetching approved KYC records:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch approved KYC records" },
            { status: 500 }
        );
    }
}
