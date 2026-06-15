import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const roles = await db.adminRole.findMany({
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                // description: true,
            }
        });

        return NextResponse.json({ success: true, roles });

    } catch (error) {
        console.error("Admin Roles API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
