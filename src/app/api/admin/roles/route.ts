import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { getISTDateWithOffset } from "@/lib/getISTDate";
/**
 * Commit: Refactor Roles API
 * - Removed unused imports
 * - Removed commented permission checks
 * - Improved code readability
 * - Added role count mapping optimization
 * - Cleaned error handling
 */

export const MODULES = [
    { key: "dashboard", label: "Dashboard" },
    { key: "kyc_pending", label: "KYC – Pending" },
    { key: "kyc_approved", label: "KYC – Approved" },
    { key: "kyc_rejected", label: "KYC – Rejected" },
    { key: "onbusers", label: "User Management" },
    { key: "staff", label: "Admin Management" },
    { key: "roles", label: "Roles & Permissions" },
];

/**
 * Default permissions for newly created roles
 */
export const defaultPerms = () =>
    Object.fromEntries(
        MODULES.map((module) => [
            module.key,
            {
                view: false,
                create: false,
                edit: false,
                delete: false,
            },
        ])
    );

/**
 * GET /api/admin/roles
 * Fetch all roles with assigned staff count
 */
export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const roles = await (db as any).adminRole.findMany({
            orderBy: {
                created_at: "asc",
            },
        });

        const roleCounts = await db.superAdmin.groupBy({
            by: ["role"],
            _count: {
                role: true,
            },
        });

        const countMap: Record<string, number> = {};

        roleCounts.forEach((item) => {
            if (item.role) {
                countMap[item.role] = item._count.role;
            }
        });

        const rolesWithCount = roles.map((role: any) => ({
            ...role,
            _count: countMap[String(role.id)] ?? 0,
        }));

        return NextResponse.json({
            success: true,
            roles: rolesWithCount,
        });
    } catch {
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/roles
 * Create a new role
 */
export async function POST(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { name, permissions } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Role name is required" },
                { status: 400 }
            );
        }

        const role = await (db as any).adminRole.create({
            data: {
                name: name.trim(),
                permissions: JSON.stringify(
                    permissions || defaultPerms()
                ),
                is_system: false,
                created_at: getISTDateWithOffset(0),
            },
        });

        return NextResponse.json({
            success: true,
            role,
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