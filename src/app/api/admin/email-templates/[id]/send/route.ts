// src/app/api/admin/email-templates/[id]/send/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";

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
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // =============================
        // STEP 3: FETCH TARGET USER
        // =============================
        const user = await db.user.findUnique({
            where: { id: Number(userId) },
        });

        if (!user || !user.email) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // =============================
        // STEP 4: SEND TEMPLATE EMAIL
        // =============================
        await sendTemplateEmail({
            templateSlug: "re-kyc-required",
            to: user.email,
            variables: {
                first_name: user.firstName,
                login_time: new Date().toLocaleString(),
                support_email: "support@cantech.in",
                current_year: new Date().getFullYear().toString(),
            },
        });

        // =============================
        // STEP 5: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: `Email sent to ${user.email}`
        });

    } catch (error) {
        console.error("Admin email template send Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}