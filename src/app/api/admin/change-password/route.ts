// src/app/api/admin/change-password/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: VALIDATE REQUEST DATA
        // =============================
        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // =============================
        // STEP 3: VERIFY CURRENT PASSWORD
        // =============================
        const isValid = await bcrypt.compare(
            currentPassword,
            adminAuth.password
        );

        if (!isValid) {
            return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
        }

        // =============================
        // STEP 4: HASH NEW PASSWORD
        // ============================
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // =============================
        // STEP 56: UPDATE PASSWORD
        // =============================
        await db.superAdmin.update({
            where: { id: adminAuth.id },
            data: {
                password: hashedPassword,
            },
        });

        // =============================
        // STEP 6: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
        // STEP 2: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}