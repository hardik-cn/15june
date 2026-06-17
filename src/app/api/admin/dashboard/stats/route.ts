// src/app/api/admin/dashboard/stats/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: FETCH DASHBOARD METRICS
        // =============================
        const [
            totalUsers,
            pendingKyc,
            approvedKyc,
            rejectedKyc,
            recentActivityProfiles,
        ] = await Promise.all([
            db.user.count(),
            db.kycProfile.count({ where: { status: "pending" } }),
            db.kycProfile.count({ where: { status: "approved" } }),
            db.kycProfile.count({ where: { status: "rejected" } }),
            db.kycProfile.findMany({
                take: 5,
                orderBy: { updatedAt: "desc" },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    status: true,
                    updatedAt: true,
                },
            }),
        ]);

        // =============================
        // STEP 3: FORMAT RECENT ACTIVITY
        // =============================
        const recentActivity = recentActivityProfiles.map(
            (profile) => {
                let action = "KYC profile updated";

                if (profile.status === "pending") {
                    action = "Submitted KYC documents for verification";
                }

                if (profile.status === "approved") {
                    action = "KYC verification approved";
                }

                if (profile.status === "rejected") {
                    action = "KYC documents rejected";
                }

                return {
                    id: profile.id,
                    user: `${profile.firstName} ${profile.lastName}`.trim() || "Unknown User",
                    action,
                    time: profile.updatedAt.toISOString(),
                    status: profile.status as "approved" | "rejected" | "pending",
                };
            }
        );

        // =============================
        // STEP 4: RETURN DASHBOARD DATA
        // =============================
        return NextResponse.json({
            stats: {
                totalUsers,
                pendingKyc,
                approvedKyc,
                rejectedKyc,
            },
            recentActivity,
        });

    } catch (error) {
        console.error("Dashboard stats fetch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}