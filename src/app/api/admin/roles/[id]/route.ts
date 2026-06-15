import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { defaultPerms } from "../route";
import { getISTDateWithOffset } from "@/lib/getISTDate";
import { decodeId } from "@/lib/admin/encodeId";

/**
 * GET /api/admin/roles/[id]
 * Fetch single role details
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const roleId = decodeId(id);

        if (Number.isNaN(roleId)) {
            return NextResponse.json(
                { error: "Invalid role ID" },
                { status: 400 }
            );
        }

        const role = await (db as any).adminRole.findUnique({
            where: { id: roleId },
        });

        if (!role) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            role,
        });
    } catch {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/roles/[id]
 * Update role
 */
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const roleId = decodeId(id);

        if (Number.isNaN(roleId)) {
            return NextResponse.json(
                { error: "Invalid role ID" },
                { status: 400 }
            );
        }

        const existingRole = await (db as any).adminRole.findUnique({
            where: { id: roleId },
        });

        if (!existingRole) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        if (existingRole.is_system) {
            return NextResponse.json(
                { error: "System roles cannot be modified" },
                { status: 403 }
            );
        }

        const { name, permissions } = await req.json();

        const updatedRole = await (db as any).adminRole.update({
            where: { id: roleId },
            data: {
                name: name?.trim() || existingRole.name,
                permissions: JSON.stringify(
                    permissions || defaultPerms()
                ),
                updated_at: getISTDateWithOffset(0),
            },
        });

        return NextResponse.json({
            success: true,
            role: updatedRole,
        });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json(
                {
                    error: "A role with this name already exists",
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/roles/[id]
 * Delete role
 */
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const roleId = decodeId(id);

        if (Number.isNaN(roleId)) {
            return NextResponse.json(
                { error: "Invalid role ID" },
                { status: 400 }
            );
        }

        const existingRole = await (db as any).adminRole.findUnique({
            where: { id: roleId },
        });

        if (!existingRole) {
            return NextResponse.json(
                { error: "Role not found" },
                { status: 404 }
            );
        }

        if (existingRole.is_system) {
            return NextResponse.json(
                { error: "System roles cannot be deleted" },
                { status: 403 }
            );
        }

        await (db as any).adminRole.delete({
            where: { id: roleId },
        });

        return NextResponse.json({
            success: true,
        });
    } catch {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}