// app/api/admin/email-templates/[id]/send/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { sendTemplateEmail } from "@/lib/emails/sendTemplateEmail";

export async function POST(req: Request) {
    try {
        // 1. Authenticate admin
        const adminAuth = await getAdminFromRequest(req);
        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Identify the target user from the request body
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        // 3. Fetch that specific user
        const user = await db.user.findUnique({ where: { id: Number(userId) } });
        if (!user || !user.email) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 5. Send the email to that user only
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

        return NextResponse.json({
            success: true,
            message: `Email sent to ${user.email}`,
        });
    } catch (error) {
        console.error("Admin email template send Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}