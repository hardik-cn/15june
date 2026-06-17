// src/app/api/admin/staff/list/route.ts

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
        // STEP 2: PARSE QUERY PARAMETERS
        // =============================
        const url = new URL(req.url);
        const type = url.searchParams.get("type");

        // =============================
        // STEP 3: BUILD FILTER CONDITIONS
        // =============================
        const where = type === "deleted" ? { status: 3 } : { status: { in: [1, 0] } };

        // =============================
        // STEP 4: FETCH ADMIN LIST
        // =============================
        const admins = await db.superAdmin.findMany({
            orderBy: {
                id: "desc"
            },
            where,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile: true,
                role: true,
                status: true,
                last_login_ip: true,
                last_login_at: true,
                two_factor_enabled: true,
                created_at: true,
                updated_at: true
            }
        });

        // =============================
        // STEP 5: FORMAT RESPONSE DATA
        // =============================
        const formattedAdmins = admins.map((admin) => ({
            ...admin,
            last_login_at: admin.last_login_at?.toISOString()?.replace("T", " ")?.slice(0, 19),
            created_at: admin.created_at?.toISOString()?.replace("T", " ")?.slice(0, 19),
            updated_at: admin.updated_at?.toISOString()?.replace("T", " ")?.slice(0, 19)
        }));

        // =============================
        // STEP 6: RETURN ADMIN LIST
        // =============================
        return NextResponse.json({
            success: true,
            admins: formattedAdmins
        });

    } catch (error) {
        console.error("ADMIN_LIST_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}