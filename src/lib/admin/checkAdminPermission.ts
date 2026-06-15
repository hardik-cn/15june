// src/lib/admin/checkAdminPermission.ts
import { db } from "@/lib/db";

export async function checkAdminPermission(admin: any, moduleKey: string, action: string = "view"): Promise<boolean> {
    if (!admin || !admin.role) return false;

    const roleInfo = await db.adminRole.findUnique({
        where: { id: Number(admin.role) }
    });

    if (!roleInfo) return false;

    if (roleInfo.name.toLowerCase().includes("super")) {
        return true;
    }

    try {
        let perms: Record<string, any> = roleInfo.permissions as any;
        if (typeof perms === "string") {
            perms = JSON.parse(perms);
            if (typeof perms === "string") {
                perms = JSON.parse(perms); // handle possible double stringification
            }
        }
        
        if (!perms || !perms[moduleKey]) return false;
        
        return perms[moduleKey][action] === true;
    } catch (e) {
        return false;
    }
}
