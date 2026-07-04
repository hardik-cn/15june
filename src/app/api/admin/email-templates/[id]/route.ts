// src/app/api/admin/email-templates/[id]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { parseDeviceInfo } from "@/lib/admin/device";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; }>; }) {
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
        const { id: idParam } = await params;

        // =============================
        // STEP 3: FETCH EMAIL TEMPLATE
        // =============================
        const id = parseInt(idParam);

        const template = await db.emailTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // =============================
        // STEP 4: RETURN TEMPLATE DATA
        // =============================
        return NextResponse.json({
            success: true,
            template
        });

    } catch (error) {
        console.error("Template GET API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; }>; }) {
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
        const { id: idParam } = await params;

        // =============================
        // STEP 3: PARSE REQUEST DATA
        // =============================
        const id = parseInt(idParam);

        const {
            name,
            subject,
            body,
            status,
        } = await req.json();

        // =============================
        // STEP 4: VALIDATE INPUT DATA
        // =============================
        if (!name || !subject || !body) {
            return NextResponse.json({ error: "Name, subject and body are required." }, { status: 400 });
        }

        // =============================
        // STEP 4.5: FETCH EXISTING EMAIL TEMPLATE
        // =============================
        const template = await db.emailTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: UPDATE EMAIL TEMPLATE
        // =============================
        const updatedTemplate = await db.emailTemplate.update({
            where: { id },
            data: {
                name,
                subject,
                body,
                status: String(status ?? "1"),
            },
        });

        // =============================
        // STEP 6: LOG ADMIN ACTIVITY
        // =============================
        const userAgent = req.headers.get("user-agent") || "unknown";
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const { device, browser } = parseDeviceInfo(userAgent);

        await logAdminActivity({
            logAction: "EMAIL_TEMPLATE_UPDATED",
            logMessage: `Email template updated successfully`,
            adminId: admin.id,
            adminName: `${admin.first_name} ${admin.last_name}`,
            ipAddress,
            userAgent,
            device,
            browser,
            rawData: {
                newData: {
                    name: updatedTemplate.name,
                    // slug: updatedTemplate.slug,
                    subject: updatedTemplate.subject,
                    // body: updatedTemplate.body,
                    status: updatedTemplate.status === "1" ? "Active" : "Inactive",
                },
                oldData: {
                    name: template.name,
                    // slug: template.slug,
                    subject: template.subject,
                    // body: template.body,
                    status: template.status === "1" ? "Active" : "Inactive",
                },
            },
        });

        // =============================
        // STEP 7: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            template: updatedTemplate
        });

    } catch (error: any) {
        console.error("Template PATCH API Error:", error);
        if (error.code === "P2002") {
            return NextResponse.json({ error: "Template with this name already exists.", }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error", }, { status: 500 });
    }
}