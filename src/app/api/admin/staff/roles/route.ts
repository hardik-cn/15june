// src/app/api/admin/staff/roles/route.ts

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
        // STEP 2: FETCH ADMIN ROLES
        // =============================
        const roles = await db.adminRole.findMany({
            orderBy: {
                name: "asc"
            },
            select: {
                id: true,
                name: true,
                // description: true,
            },
        });

        // =============================
        // STEP 3: RETURN ROLE LIST
        // =============================
        return NextResponse.json({
            success: true,
            roles,
        });

    } catch (error) {
        console.error("ADMIN_ROLES_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}