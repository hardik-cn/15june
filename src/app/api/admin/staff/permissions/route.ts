import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

// GET /api/admin/staff/permissions?adminId=xxx
export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const adminId = parseInt(searchParams.get("adminId") || "");

        if (isNaN(adminId)) {
            return NextResponse.json({ error: "adminId is required" }, { status: 400 });
        }

        const permissions = await (db as any).adminPermission.findMany({
            where: { adminId },
        });

        return NextResponse.json({ success: true, permissions });
    } catch (error) {
        console.error("GET /api/admin/staff/permissions error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/admin/staff/permissions — upsert permissions for an admin
export async function POST(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (admin.role !== 1) {
            return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
        }

        const body = await req.json();
        const { adminId, permissions } = body;
        // permissions = { module: { view, create, edit, delete }, ... }

        if (!adminId || !permissions) {
            return NextResponse.json({ error: "adminId and permissions are required" }, { status: 400 });
        }

        // Verify target admin exists
        const targetAdmin = await db.superAdmin.findUnique({ where: { id: parseInt(adminId) } });
        if (!targetAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // Upsert each module permission
        const upsertOps = Object.entries(permissions).map(([module, perms]: [string, any]) =>
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

        await db.$transaction(upsertOps);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /api/admin/staff/permissions error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
