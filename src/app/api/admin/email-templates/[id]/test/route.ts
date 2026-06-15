// app/api/admin/email-templates/[id]/test/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { sendEmailWithTemplate } from "@/lib/emails/emailService";

const MODULE_KEY = "email-templates";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { params } = context;
        const { id } = await params;

        const templateId = parseInt(id);

        const admin = await getAdminFromRequest(req);
        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { testEmail, variables } = await req.json();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!testEmail || !emailRegex.test(testEmail)) {
            return NextResponse.json(
                { error: "Valid test email address is required." },
                { status: 400 }
            );
        }

        const template = await db.emailTemplate.findUnique({
            where: { id: templateId },
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

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

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: "Test email sent successfully",
                messageId: result.messageId,
            });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (error) {
        console.error("Template Test POST API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const adminAuth = await getAdminFromRequest(req);
        if (!adminAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        return NextResponse.json({ message: "Admin email template test endpoint is active" });
    } catch (error) {
        console.error("Admin email template test GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}