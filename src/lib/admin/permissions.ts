// src/lib/admin/permissions.ts

import { db } from "@/lib/db";

export type PermissionAction =
    | "view"
    | "create"
    | "edit"
    | "delete";

/**
 * Checks whether an admin has permission
 * to perform a specific action on a module.
 *
 * Super Admins (role === "1")
 * automatically bypass permission checks.
 */
export async function hasPermission(admin: any, module: string, action: PermissionAction): Promise<boolean> {
    // =============================
    // STEP 1: VALIDATE ADMIN
    // =============================
    if (!admin || !admin.id) return false;

    // =============================
    // STEP 2: CHECK SUPER ADMIN
    // =============================
    if (admin.role === "1") return true;

    // =============================
    // STEP 3: FETCH MODULE PERMISSION
    // =============================
    const permission = await (db as any).adminPermission.findFirst({
        where: { admin_id: admin.id, module: module },
    });

    if (!permission) return false;

    // =============================
    // STEP 4: CHECK ACTION PERMISSION
    // =============================
    switch (action) {
        case "view":
            return !!permission.can_view;

        case "create":
            return !!permission.can_create;

        case "edit":
            return !!permission.can_edit;

        case "delete":
            return !!permission.can_delete;

        default:
            return false;
    }
}