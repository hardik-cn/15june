// src/app/api/admin/email-templates/[id]/test/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { sendEmailWithTemplate } from "@/lib/emails/emailService";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: GET TEMPLATE ID
        // =============================
        const { params } = context;
        const { id } = await params;

        const templateId = parseInt(id);

        // =============================
        // STEP 3: VALIDATE REQUEST DATA
        // =============================
        const { testEmail, variables } = await req.json();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!testEmail || !emailRegex.test(testEmail)) {
            return NextResponse.json({ error: "Valid test email address is required." }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH EMAIL TEMPLATE
        // =============================
        const template = await db.emailTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: SEND TEST EMAIL
        // =============================
        const result = await sendEmailWithTemplate({
            templateName: template.slug,
            recipient: testEmail,
            variables: variables || {
                name: "Test User",
                email: testEmail,
                date: new Date().toLocaleDateString(),
                year: new Date().getFullYear(),
            },
        });

        // =============================
        // STEP 6: RETURN RESULT
        // =============================
        if (result.success) {
            return NextResponse.json({
                success: true,
                message: "Test email sent successfully",
                messageId: result.messageId
            });
        }

        return NextResponse.json({ error: result.error }, { status: 500 });

    } catch (error) {
        console.error("Template Test POST API Error:", error);
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
        // STEP 2: RETURN ENDPOINT STATUS
        // =============================
        return NextResponse.json({ message: "Admin email template test endpoint is active" });

    } catch (error) {
        console.error("Admin email template test GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}