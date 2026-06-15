import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { hasPermission } from "@/lib/admin/permissions";

export async function POST(req: Request) {
    try {
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // if (!(await hasPermission(admin, "change_password", "edit"))) {
        //     return NextResponse.json({ error: "Access Denied: You do not have permission to change password." }, { status: 403 });
        // }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, adminAuth.password);
        if (!isValid) {
            return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.superAdmin.update({
            where: { id: adminAuth.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({ success: true, message: "Password updated successfully" });

    } catch (error) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: Request) {

    try {
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // if (!(await hasPermission(admin, "change_password", "view"))) {
        //     return NextResponse.json({ error: "Access Denied: You do not have permission to view change password." }, { status: 403 });
        // }
    } catch (error) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
    // return NextResponse.json({ error: "Method Not Allowed. This endpoint requires a POST request." }, { status: 405 });
}