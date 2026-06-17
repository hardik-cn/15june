// src/app/api/admin/staff/activity/route.ts

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
        // STEP 2: VALIDATE QUERY PARAMS
        // =============================
        const url = new URL(req.url);
        const adminIdParam = url.searchParams.get("adminId");
        const adminId = adminIdParam ? Number(adminIdParam) : NaN;

        if (!adminIdParam || Number.isNaN(adminId)) {
            return NextResponse.json({ error: "adminId is required" }, { status: 400 });
        }

        // =============================
        // STEP 3: FETCH ACTIVITY LOGS
        // =============================
        const logs = await db.adminActivityLog.findMany({
            where: { adminId },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                logAction: true,
                logMessage: true,
                ipAddress: true,
                userAgent: true,
                device: true,
                browser: true,
                createdAt: true,
            },
        });

        // =============================
        // STEP 4: FORMAT RESPONSE DATA
        // =============================
        const formattedLogs = logs.map((log) => ({ ...log, createdAt: log.createdAt?.toISOString().replace("T", " ").slice(0, 19), }));

        // =============================
        // STEP 5: RETURN ACTIVITY LOGS
        // =============================
        return NextResponse.json({
            success: true,
            logs: formattedLogs,
        });

    } catch (error) {
        console.error("ADMIN_ACTIVITY_LOG_API_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}