// src/app/api/whmcs/tickets/update/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { z } from "zod";

const updateTicketSchema = z.object({
    ticketid: z.union([z.string(), z.number()]).transform(val => String(val)),
    cc: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const parsed = updateTicketSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Ticket ID is required", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { ticketid, cc } = parsed.data;

        const params = new URLSearchParams({
            action: "UpdateTicket",
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            ticketid: String(ticketid),
            cc: cc !== undefined ? cc : "",
            responsetype: "json"
        });

        const res = await fetch(process.env.WHMCS_API_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });

        const result = await res.json();
        if (result.result !== "success") {
            return NextResponse.json({ error: result.message || "Failed to update ticket" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("UpdateTicket error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
