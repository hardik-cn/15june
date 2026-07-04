// src/app/api/admin/email-templates/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { parseDeviceInfo } from "@/lib/admin/device";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { z } from "zod";

export async function GET(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: FETCH EMAIL TEMPLATES
        // =============================
        const templates =
            await db.emailTemplate.findMany({
                where: { status: { in: ["1", "0"] } },
                orderBy: {
                    id: "desc"
                },
            });

        // =============================
        // STEP 3: RETURN TEMPLATE DATA
        // =============================
        return NextResponse.json({
            success: true,
            templates
        });

    } catch (error) {
        console.error("Templates GET API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PARSE REQUEST DATA
        // =============================
        const templateSchema = z.object({
            name: z.string().min(1).max(100),
            subject: z.string().min(1).max(255),
            body: z.string().min(1),
            status: z.enum(["0", "1"]).optional(),
        });

        const parsed = templateSchema.safeParse(await req.json());

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid template data" }, { status: 400 });
        }

        const { name, subject, body, status } = parsed.data;

        // =============================
        // STEP 3: VALIDATE INPUT DATA
        // =============================
        if (!name || !subject || !body) {
            return NextResponse.json({ error: "Name, subject and body are required." }, { status: 400 });
        }

        // =============================
        // STEP 4: GENERATE TEMPLATE SLUG
        // =============================
        const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        // =============================
        // STEP 5: CREATE EMAIL TEMPLATE
        // =============================
        const template =
            await db.emailTemplate.create({
                data: {
                    name,
                    subject,
                    body,
                    status: String(status ?? "1"),
                    slug
                }
            });

        // =============================
        // STEP 6: LOG ADMIN ACTIVITY
        // =============================
        const userAgent = req.headers.get("user-agent") || "unknown";
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const { device, browser } = parseDeviceInfo(userAgent);

        await logAdminActivity({
            logAction: "EMAIL_TEMPLATE_CREATED",
            logMessage: `Email template created successfully`,
            adminId: admin.id,
            adminName: `${admin.first_name} ${admin.last_name}`,
            ipAddress,
            userAgent,
            device,
            browser,
            rawData: {
                newData: {
                    name: template.name,
                    // slug: template.slug,
                    subject: template.subject,
                    // body: template.body,
                    status: template.status === "1" ? "Active" : "Inactive",
                },
                oldData: null,
            },
        });

        // =============================
        // STEP 7: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            template
        });

    } catch (error: any) {

        console.error("Templates POST API Error:", error);
        if (error.code === "P2002") {
            return NextResponse.json({ error: "Email Template with this slug already exists." }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}