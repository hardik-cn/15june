import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { z } from "zod";

const ticketAttachmentSchema = z.object({
    relatedid: z.string().min(1, "relatedid is required"),
    type: z.enum(["ticket", "reply", "note"]),
    index: z.coerce.number().int().nonnegative(),
});

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const relatedid = searchParams.get("relatedid");
        const type = searchParams.get("type");
        const index = searchParams.get("index");

        const parsed = ticketAttachmentSchema.safeParse({
            relatedid,
            type,
            index: index !== null ? index : undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid parameters", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const data = parsed.data;

        const params = new URLSearchParams({
            action: "GetTicketAttachment",
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            relatedid: data.relatedid,
            type: data.type,
            index: String(data.index),
            responsetype: "json",
        });

        const res = await fetch(process.env.WHMCS_API_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });

        const result = await res.json();
        
        if (result.result !== "success") {
            return NextResponse.json({ error: result.message || "Failed to fetch attachment" }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("GetTicketAttachment error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
