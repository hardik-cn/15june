// src/app/api/admin/roles/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export const MODULES = [
    { key: "dashboard", label: "Dashboard" },
    { key: "kyc_pending", label: "KYC - Pending" },
    { key: "kyc_approved", label: "KYC - Approved" },
    { key: "kyc_rejected", label: "KYC - Rejected" },
    { key: "onbusers", label: "User Management" },
    { key: "staff", label: "Admin Management" },
    { key: "roles", label: "Roles & Permissions" },
];

export const defaultPerms = () =>
    Object.fromEntries(
        MODULES.map((module) => [module.key, { view: false, create: false, edit: false, delete: false }])
    );

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
        // STEP 2: FETCH ROLES
        // =============================
        const roles = await (db as any).adminRole.findMany({
            orderBy: {
                created_at: "asc"
            }
        });

        // =============================
        // STEP 3: FETCH ROLE ASSIGNMENT COUNTS
        // =============================
        const roleCounts = await db.superAdmin.groupBy({
            by: ["role"],
            _count: { role: true },
        });

        // =============================
        // STEP 4: BUILD ROLE COUNT MAP
        // =============================
        const countMap: Record<string, number> = {};

        roleCounts.forEach((item) => {
            if (item.role) countMap[item.role] = item._count.role;
        });

        // =============================
        // STEP 5: ATTACH COUNTS TO ROLES
        // =============================
        const rolesWithCount = roles.map((role: any) => ({
            ...role,
            _count: countMap[String(role.id)] ?? 0
        }));

        // =============================
        // STEP 6: RETURN ROLE DATA
        // =============================
        return NextResponse.json({
            success: true,
            roles: rolesWithCount
        });

    } catch {
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
        // STEP 2: PARSE REQUEST DATA
        // =============================
        const { name, permissions } = await req.json();

        // =============================
        // STEP 3: VALIDATE ROLE DATA
        // =============================
        if (!name?.trim()) {
            return NextResponse.json({ error: "Role name is required" }, { status: 400 });
        }

        // =============================
        // STEP 4: CREATE ROLE
        // =============================
        const role = await (db as any).adminRole.create({
            data: {
                name: name.trim(),
                permissions: JSON.stringify(permissions || defaultPerms()),
                is_system: false,
                created_at: getISTDateWithOffset(0),
            },
        });

        // =============================
        // STEP 5: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            role
        });

    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}