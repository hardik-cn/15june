import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";

export async function PUT(req: Request) {
    try {
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        // console.log("Admin Update Incoming Body:", body);

        const { id, firstName, lastName, email, phoneNumber, role, status, password, twoFactorEnabled, isRestore } = body;

        if (!id) {
            return NextResponse.json({ error: "Admin ID is required" }, { status: 400 });
        }

        // Check if admin exists
        const existingAdmin = await db.superAdmin.findUnique({
            where: { id: parseInt(id) },
        });

        // get exist role name
        const existingRole = await db.adminRole.findUnique({
            where: { id: parseInt(existingAdmin!.role.toString()) },
            select: { name: true }
        });

        if (!existingAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        // Prepare update data
        const updateData: any = {
            first_name: firstName,
            last_name: lastName,
            email,
            mobile: phoneNumber,
            role,
            status:
                typeof status === "number"
                    ? status
                    : status === "active" || status === true
                        ? 1
                        : 0,
            two_factor_enabled: twoFactorEnabled === true,
        };

        // Update password only if provided
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        // Update Admin
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
                created_at: true
            }
        });

        // get admin role name
        const adminRole = await db.adminRole.findUnique({
            where: { id: parseInt(updatedAdmin.role.toString()) },
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
            oldData: isRestore ? null : {
                name: `${updatedAdmin.first_name || ""} ${updatedAdmin.last_name || ""}`.trim(),
                email: updatedAdmin.email,
                role: adminRole?.name,
                status: updatedAdmin.status ? "active" : "inactive",
                phone: updatedAdmin.mobile,
                twoFactorEnabled: updatedAdmin.two_factor_enabled,
            },
        };

        const deviceInfo = parseDeviceInfo(req.headers.get("user-agent") || "unknown");

        await logAdminActivity({
            logAction: isRestore ? "STAFF_RESTORED" : "STAFF_UPDATED",
            logMessage: isRestore ? "Staff restored successfully" : "Staff updated successfully",
            userId: updatedAdmin.id,
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

        return NextResponse.json({ success: true, admin: updatedAdmin });

    } catch (error) {
        console.error("Update Admin API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ message: "Admin update endpoint is active" });
    } catch (error) {
        console.error("Admin Update GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
export async function PATCH(req: Request) {
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

        const existingAdmin = await db.superAdmin.findUnique({
            where: { id: parseInt(id) },
            select: { id: true, status: true, LastStatus: true, first_name: true, last_name: true, email: true, mobile: true, two_factor_enabled: true, role: true },
        });

        if (!existingAdmin) {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        if (existingAdmin.status !== 3) {
            return NextResponse.json({ error: "Admin is not deleted" }, { status: 400 });
        }

        const restoreStatus = existingAdmin.LastStatus ?? 1;

        await db.superAdmin.update({
            where: { id: parseInt(id) },
            data: {
                status: restoreStatus,
                LastStatus: null,
            },
        });

        // get admin role name
        const existingRole = await db.adminRole.findUnique({
            where: { id: parseInt(existingAdmin.role.toString()) },
            select: { name: true },
        });

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

        const deviceInfo = parseDeviceInfo(req.headers.get("user-agent") || "unknown");

        await logAdminActivity({
            logAction: "STAFF_RESTORE",
            logMessage: "Staff restored successfully",
            userId: existingAdmin.id,
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