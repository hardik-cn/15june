// app/api/admin/email-templates/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const templates = await db.emailTemplate.findMany({
            where: { status: "1" },
            orderBy: { id: 'desc' }
        });
        // console.log(templates);
        return NextResponse.json({ success: true, templates });
    } catch (error) {
        console.error("Templates GET API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, subject, body, status } = await req.json();

        if (!name || !subject || !body) {
            return NextResponse.json({ error: "Name, subject and body are required." }, { status: 400 });
        }

        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const template = await db.emailTemplate.create({
            data: { name, subject, body, status: String(status ?? "1"), slug }
        });

        return NextResponse.json({ success: true, template });
    } catch (error: any) {
        console.error("Templates POST API Error:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Template with this slug already exists." }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
