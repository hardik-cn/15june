import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

const MODULE_KEY = "email-templates";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const admin = await getAdminFromRequest(req);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const id = parseInt(idParam);
        const template = await db.emailTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, template });
    } catch (error) {
        console.error("Template GET API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const admin = await getAdminFromRequest(req);
        if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const id = parseInt(idParam);
        const { name, subject, body, status } = await req.json();

        if (!name || !subject || !body) {
            return NextResponse.json({ error: "Name, subject and body are required." }, { status: 400 });
        }

        const updatedTemplate = await db.emailTemplate.update({
            where: { id },
            data: { name, subject, body, status: String(status ?? "1") }
        });

        return NextResponse.json({ success: true, template: updatedTemplate });
    } catch (error: any) {
        console.error("Template PATCH API Error:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Template with this name already exists." }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}