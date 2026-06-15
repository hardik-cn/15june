import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        // We also need to get the admin roles for displaying
        // For simplicity, we can fetch all admin roles
        const admins = await db.superAdmin.findMany({
            select: { id: true, role: true }
        });

        const roles = await db.adminRole.findMany({
            select: { id: true, name: true }
        });

        const roleMap: Record<number, string> = {};
        roles.forEach(r => {
            roleMap[r.id] = r.name;
        });

        const adminRoleMap: Record<number, string> = {};
        admins.forEach(a => {
            adminRoleMap[a.id] = roleMap[Number(a.role)] || "Unknown Role";
        });

        return NextResponse.json({
            success: true,
            logs: logs.map((l) => ({
                id: l.id.toString(),
                logAction: l.logAction,
                logMessage: l.logMessage,
                rawData: l.rawData,
                userId: l.userId,
                username: l.username,
                adminId: l.adminId,
                adminName: l.adminName,
                actorRole: l.adminId ? adminRoleMap[l.adminId] || "Admin" : "System",
                ipAddress: l.ipAddress,
                userAgent: l.userAgent,
                device: l.device,
                browser: l.browser,
                createdAt: l.createdAt?.toISOString().replace("T", " ").slice(0, 19),
            })),
        });

    } catch (error) {
        console.error("Admin Activity Log API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
