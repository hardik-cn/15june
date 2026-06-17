// src/app/api/admin/activity-log/route.ts

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
        // STEP 2: FETCH ACTIVITY LOGS
        // =============================
        const logs = await db.adminActivityLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
            select: {
                id: true,
                logAction: true,
                logMessage: true,
                rawData: true,
                userId: true,
                username: true,
                adminId: true,
                adminName: true,
                ipAddress: true,
                userAgent: true,
                device: true,
                browser: true,
                createdAt: true,
            },
        });

        // =============================
        // STEP 3: FETCH ADMIN ROLE DATA
        // =============================
        const admins = await db.superAdmin.findMany({ select: { id: true, role: true } });
        const roles = await db.adminRole.findMany({ select: { id: true, name: true } });

        // =============================
        // STEP 4: BUILD ROLE MAPPINGS
        // =============================
        const roleMap: Record<number, string> = {};
        roles.forEach((role) => { roleMap[role.id] = role.name });

        const adminRoleMap: Record<number, string> = {};
        admins.forEach((admin) => { adminRoleMap[admin.id] = roleMap[Number(admin.role)] || "Unknown Role" });

        // =============================
        // STEP 5: FORMAT AND RETURN LOGS
        // =============================
        return NextResponse.json({
            success: true,
            logs: logs.map((log) => ({
                id: log.id.toString(),
                logAction: log.logAction,
                logMessage: log.logMessage,
                rawData: log.rawData,
                userId: log.userId,
                username: log.username,
                adminId: log.adminId,
                adminName: log.adminName,
                actorRole: log.adminId ? adminRoleMap[log.adminId] || "Admin" : "System",
                ipAddress: log.ipAddress,
                userAgent: log.userAgent,
                device: log.device,
                browser: log.browser,
                createdAt: log.createdAt?.toISOString().replace("T", " ").slice(0, 19),
            })),
        });

    } catch (error) {
        console.error("Admin Activity Log API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}