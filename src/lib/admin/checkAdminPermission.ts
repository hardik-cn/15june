// src/lib/admin/checkAdminPermission.ts

import { db } from "@/lib/db";

export async function checkAdminPermission(admin: any, moduleKey: string, action: string = "view"): Promise<boolean> {
    // =============================
    // STEP 1: VALIDATE ADMIN DATA
    // =============================
    if (!admin || !admin.role) {
        return false;
    }

    // =============================
    // STEP 2: FETCH ADMIN ROLE
    // =============================
    const roleInfo = await db.adminRole.findUnique({
        where: { id: Number(admin.role) }
    });

    if (!roleInfo) {
        return false;
    }

    // =============================
    // STEP 3: ALLOW SUPER ADMIN
    // =============================
    if (roleInfo.name.toLowerCase().includes("super")) {
        return true;
    }

    try {
        // =============================
        // STEP 4: PARSE ROLE PERMISSIONS
        // =============================
        let perms: Record<string, any> = roleInfo.permissions as any;

        if (typeof perms === "string") {
            perms = JSON.parse(perms);

            // Handle double-stringified JSON
            if (typeof perms === "string") {
                perms = JSON.parse(perms);
            }
        }

        // =============================
        // STEP 5: VERIFY MODULE ACCESS
        // =============================
        if (!perms || !perms[moduleKey]) {
            return false;
        }

        // =============================
        // STEP 6: CHECK ACTION PERMISSION
        // =============================
        return perms[moduleKey][action] === true;

    } catch (error) {
        console.error("CHECK_ADMIN_PERMISSION_ERROR:", error);
        return false;
    }
}