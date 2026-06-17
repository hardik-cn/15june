// src/app/api/admin/staff/permissions/route.ts

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
        const { searchParams } = new URL(req.url);
        const adminId = parseInt(searchParams.get("adminId") || "");

        // =============================
        // STEP 3: VALIDATE ADMIN ID
        // =============================
        if (isNaN(adminId)) {
            return NextResponse.json({ error: "adminId is required" }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH ADMIN PERMISSIONS
        // =============================
        const permissions = await (db as any).adminPermission.findMany({
            where: { adminId },
        });

        // =============================
        // STEP 5: RETURN PERMISSIONS
        // =============================
        return NextResponse.json({
            success: true,
            permissions,
        });

    } catch (error) {
        console.error("ADMIN_PERMISSIONS_GET_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: AUTHORIZE SUPER ADMIN
        // =============================
        if (admin.role !== 1) {
            return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
        }

        // =============================
        // STEP 3: PARSE REQUEST DATA
        // =============================
        const body = await req.json();

        const { adminId, permissions } = body;

        // =============================
        // STEP 4: VALIDATE REQUEST DATA
        // =============================
        if (!adminId || !permissions) {
            return NextResponse.json({ error: "adminId and permissions are required" }, { status: 400 });
        }

        // =============================
        // STEP 5: VERIFY TARGET ADMIN
        // =============================
        const targetAdmin = await db.superAdmin.findUnique({
            where: { id: parseInt(adminId) }
        });

        if (!targetAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // =============================
        // STEP 6: PREPARE PERMISSION UPSERTS
        // =============================
        const upsertOps = Object.entries(permissions).map(
            ([module, perms]: [string, any]) =>
                (db as any).adminPermission.upsert({
                    where: { adminId_module: { adminId: parseInt(adminId), module } },
                    create: {
                        adminId: parseInt(adminId),
                        module,
                        can_view: perms.view ?? false,
                        can_create: perms.create ?? false,
                        can_edit: perms.edit ?? false,
                        can_delete: perms.delete ?? false,
                    },
                    update: {
                        can_view: perms.view ?? false,
                        can_create: perms.create ?? false,
                        can_edit: perms.edit ?? false,
                        can_delete: perms.delete ?? false,
                    },
                })
        );

        // =============================
        // STEP 7: SAVE PERMISSIONS
        // =============================
        await db.$transaction(upsertOps);

        // =============================
        // STEP 8: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error("ADMIN_PERMISSIONS_POST_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}