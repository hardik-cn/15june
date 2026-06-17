// src/app/api/admin/staff/update/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";

export async function PUT(req: Request) {
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

        const {
            id,
            firstName,
            lastName,
            email,
            phoneNumber,
            role,
            status,
            password,
            twoFactorEnabled,
            isRestore,
        } = body;

        // =============================
        // STEP 3: VALIDATE ADMIN ID
        // =============================
        if (!id) {
            return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH EXISTING ADMIN
        // =============================
        const existingAdmin = await db.superAdmin.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: FETCH EXISTING ROLE DETAILS
        // =============================
        const existingRole = await db.adminRole.findUnique({
            where: { id: parseInt(existingAdmin.role.toString()) },
            select: {
                name: true
            }
        });

        // =============================
        // STEP 6: PREPARE UPDATE DATA
        // =============================
        const updateData: any = {
            first_name: firstName,
            last_name: lastName,
            email,
            mobile: phoneNumber,
            role,
            status: typeof status === "number" ? status : status === "active" || status === true ? 1 : 0,
            two_factor_enabled: twoFactorEnabled === true
        };

        // =============================
        // STEP 7: HASH PASSWORD IF PROVIDED
        // =============================
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // =============================
        // STEP 8: UPDATE ADMIN ACCOUNT
        // =============================
        const updatedAdmin = await db.superAdmin.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile: true,
                role: true,
                status: true,
                two_factor_enabled: true,
                created_at: true,
            },
        });

        // =============================
        // STEP 9: FETCH UPDATED ROLE DETAILS
        // =============================
        const adminRole = await db.adminRole.findUnique({
            where: { id: parseInt(updatedAdmin.role.toString()) },
            select: {
                name: true
            }
        });

        // =============================
        // STEP 10: PREPARE ACTIVITY LOG DATA
        // =============================
        const rawData = {
            newData: {
                name: `${existingAdmin.first_name || ""} ${existingAdmin.last_name || ""}`.trim(),
                email: existingAdmin.email,
                role: existingRole?.name,
                status: existingAdmin.status ? "active" : "inactive",
                phone: existingAdmin.mobile,
                twoFactorEnabled: existingAdmin.two_factor_enabled,
            },
            oldData: isRestore
                ? null
                : {
                    name: `${updatedAdmin.first_name || ""} ${updatedAdmin.last_name || ""}`.trim(),
                    email: updatedAdmin.email,
                    role: adminRole?.name,
                    status: updatedAdmin.status ? "active" : "inactive",
                    phone: updatedAdmin.mobile,
                    twoFactorEnabled: updatedAdmin.two_factor_enabled,
                },
        };

        // =============================
        // STEP 11: COLLECT DEVICE INFORMATION
        // =============================
        const deviceInfo = parseDeviceInfo(
            req.headers.get("user-agent") || "unknown"
        );

        // =============================
        // STEP 12: LOG UPDATE ACTIVITY
        // =============================
        await logAdminActivity({
            logAction: isRestore ? "STAFF_RESTORED" : "STAFF_UPDATED",
            logMessage: isRestore ? "Staff restored successfully" : "Staff updated successfully",
            userId: updatedAdmin.id,
            adminId: adminAuth.id,
            adminName: `${adminAuth.first_name || ""} ${adminAuth.last_name || ""}`.trim() || null,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            rawData,
            userAgent: req.headers.get("user-agent") || "unknown"
        });

        // =============================
        // STEP 13: RETURN UPDATED ADMIN
        // =============================
        return NextResponse.json({
            success: true,
            admin: updatedAdmin,
        });

    } catch (error) {
        console.error("ADMIN_UPDATE_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


export async function PATCH(req: Request) {
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
        // STEP 3: VALIDATE ADMIN ID
        // =============================
        if (!id) {
            return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH ADMIN RECORD
        // =============================
        const existingAdmin = await db.superAdmin.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                status: true,
                LastStatus: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile: true,
                two_factor_enabled: true,
                role: true,
            },
        });

        if (!existingAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: VERIFY ADMIN IS DELETED
        // =============================
        if (existingAdmin.status !== 3) {
            return NextResponse.json({ error: "Admin is not deleted" }, { status: 400 });
        }

        // =============================
        // STEP 6: DETERMINE RESTORE STATUS
        // =============================
        const restoreStatus = existingAdmin.LastStatus ?? 1;

        // =============================
        // STEP 7: RESTORE ADMIN ACCOUNT
        // =============================
        await db.superAdmin.update({
            where: { id: parseInt(id) },
            data: {
                status: restoreStatus,
                LastStatus: null,
            },
        });

        // =============================
        // STEP 8: FETCH ROLE INFORMATION
        // =============================
        const existingRole = await db.adminRole.findUnique({
            where: {
                id: parseInt(existingAdmin.role.toString())
            },
            select: {
                name: true
            },
        });

        // =============================
        // STEP 9: PREPARE ACTIVITY LOG DATA
        // =============================
        const rawData = {
            newData: {
                name: `${existingAdmin.first_name || ""} ${existingAdmin.last_name || ""}`.trim(),
                email: existingAdmin.email,
                role: existingRole?.name,
                status: restoreStatus === 1 ? "active" : "inactive",
                phone: existingAdmin.mobile,
                twoFactorEnabled: existingAdmin.two_factor_enabled,
            },
            oldData: null,
        };

        // =============================
        // STEP 10: EXTRACT DEVICE INFORMATION
        // =============================
        const deviceInfo = parseDeviceInfo(req.headers.get("user-agent") || "unknown");

        // =============================
        // STEP 11: LOG RESTORE ACTIVITY
        // =============================
        await logAdminActivity({
            logAction: "STAFF_RESTORE",
            logMessage: "Staff restored successfully",
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
        // STEP 12: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "Admin restored successfully",
            restoredStatus: restoreStatus,
        });

    } catch (error) {
        console.error("Restore Admin API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: VERIFY ENDPOINT STATUS
        // =============================
        return NextResponse.json({ message: "Admin update endpoint is active" });

    } catch (error) {
        console.error("Admin Update GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}