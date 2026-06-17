// src/app/api/admin/email-templates/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

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
                where: { status: "1" },
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
        const { name, subject, body, status, } = await req.json();

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
        // STEP 6: RETURN SUCCESS RESPONSE
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