import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";

export async function DELETE(req: Request) {
    try {
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }

        if (adminAuth.id === parseInt(id)) {
            return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        }

        // Check if admin exists
        const existingAdmin = await db.superAdmin.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // Delete Admin
        await db.superAdmin.update({
            where: { id: parseInt(id) },
            data: {
                LastStatus: existingAdmin.status,
                status: 3,
            }
        });

        // get admin role name
        const existingRole = await db.adminRole.findUnique({
            where: { id: parseInt(existingAdmin.role.toString()) },
            select: { name: true }
        });

        const rawData = {
            newData: {
                name: `${existingAdmin.first_name || ""} ${existingAdmin.last_name || ""}`.trim(),
                email: existingAdmin.email,
                role: existingRole?.name,
                status: existingAdmin.status ? "active" : "inactive",
                phone: existingAdmin.mobile,
                twoFactorEnabled: existingAdmin.two_factor_enabled,
            },
            oldData: null
        };

        const deviceInfo = parseDeviceInfo(req.headers.get("user-agent") || "unknown");

        await logAdminActivity({
            logAction: "STAFF_DELETE",
            logMessage: "Staff deleted successfully",
            userId: existingAdmin.id,
            // username: `${updatedAdmin.first_name} ${updatedAdmin.last_name}`,
            adminId: adminAuth.id,
            adminName: `${adminAuth.first_name || ""} ${adminAuth.last_name || ""}`.trim() || null,
            ipAddress:
                req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown",
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            rawData,
            userAgent: req.headers.get("user-agent") || "unknown",
        });

        return NextResponse.json({ success: true, message: "Admin deleted successfully" });

    } catch (error) {
        console.error("Delete Admin API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
