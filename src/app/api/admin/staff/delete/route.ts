// src/app/api/admin/staff/delete/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function DELETE(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PARSE REQUEST DATA
        // =============================
        const body = await req.json();
        const { id } = body;

        // =============================
        // STEP 3: VALIDATE REQUEST DATA
        // =============================
        if (!id) {
            return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }
        if (adminAuth.id === parseInt(id)) {
            return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH TARGET ADMIN
        // =============================
        const existingAdmin = await db.superAdmin.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: SOFT DELETE ADMIN
        // =============================
        await db.superAdmin.update({
            where: { id: parseInt(id) },
            data: {
                LastStatus: existingAdmin.status,
                status: 3,
                updated_at: getISTDateWithOffset(0)
            },
        });

        // =============================
        // STEP 6: FETCH ROLE DETAILS
        // =============================
        const existingRole = await db.adminRole.findUnique({
            where: {
                id: parseInt(existingAdmin.role.toString())
            },
            select: {
                name: true
            }
        });

        // =============================
        // STEP 7: PREPARE ACTIVITY LOG DATA
        // =============================
        const rawData = {
            newData: {
                name: `${existingAdmin.first_name || ""} ${existingAdmin.last_name || ""}`.trim(),
                email: existingAdmin.email,
                role: existingRole?.name,
                status: existingAdmin.status ? "Active" : "Inactive",
                phone: existingAdmin.mobile,
                twoFactorEnabled: existingAdmin.two_factor_enabled,
            },
            oldData: null,
        };

        // =============================
        // STEP 8: COLLECT DEVICE INFORMATION
        // =============================
        const deviceInfo = parseDeviceInfo(req.headers.get("user-agent") || "unknown");

        // =============================
        // STEP 9: LOG DELETE ACTIVITY
        // =============================
        await logAdminActivity({
            logAction: "STAFF_DELETE",
            logMessage: "Staff deleted successfully",
            userId: existingAdmin.id,
            adminId: adminAuth.id,
            adminName: `${adminAuth.first_name || ""} ${adminAuth.last_name || ""}`.trim() || null,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            rawData,
            userAgent: req.headers.get("user-agent") || "unknown",
        });

        // =============================
        // STEP 10: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "Admin deleted successfully",
        });

    } catch (error) {
        console.error("ADMIN_DELETE_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}