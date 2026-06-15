import { db } from "@/lib/db";

export type PermissionAction = "view" | "create" | "edit" | "delete";

/**
 * Checks if an admin has permission for a specific module and action.
 * Super Admins (role === "1") skip this check and always return true.
 */
export async function hasPermission(admin: any, module: string, action: PermissionAction): Promise<boolean> {
    if (!admin || !admin.id) return false;

    // 1. Super Admin check
    if (admin.role === "1") return true;

    // 2. Check for explicit permission in AdminPermission table
    const permission = await (db as any).adminPermission.findFirst({
        where: {
            admin_id: admin.id,
            module: module,
        },
    });

    if (!permission) return false;

    // 3. Map action to column name
    switch (action) {
        case "view": return !!permission.can_view;
        case "create": return !!permission.can_create;
        case "edit": return !!permission.can_edit;
        case "delete": return !!permission.can_delete;
        default: return false;
    }
}
