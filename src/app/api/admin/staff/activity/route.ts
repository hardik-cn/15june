import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const adminIdParam = url.searchParams.get("adminId");
        const adminId = adminIdParam ? Number(adminIdParam) : NaN;

        if (!adminIdParam || Number.isNaN(adminId)) {
            return NextResponse.json({ error: "adminId is required" }, { status: 400 });
        }

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

        return NextResponse.json({
            success: true,
            logs: logs.map((l) => ({
                ...l,
                createdAt: l.createdAt?.toISOString().replace("T", " ").slice(0, 19),
            })),
        });
    } catch (error) {
        console.error("Admin Staff Activity API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
