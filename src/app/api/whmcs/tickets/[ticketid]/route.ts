// src/app/api/whmcs/tickets/[ticketid]/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";

export async function GET(
    req: Request,
    context: { params: Promise<{ ticketid: string }> }
) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { ticketid } = await context.params;
        const { searchParams } = new URL(req.url);
        const repliessort = searchParams.get("repliessort") || "ASC";

        if (!ticketid) {
            return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
        }

        const data = await callWhmcsApi("GetTicket", {
            ticketid: ticketid,
            repliessort,
        });

        // Normalize replies
        let replies: any[] = [];
        if (data.replies?.reply) {
            replies = Array.isArray(data.replies.reply)
                ? data.replies.reply
                : [data.replies.reply];
        }

        // Normalize notes
        let notes: any[] = [];
        if (data.notes?.note) {
            notes = Array.isArray(data.notes.note)
                ? data.notes.note
                : [data.notes.note];
        }

        return NextResponse.json({
            ticketid: data.ticketid,
            tid: data.tid,
            c: data.c,
            deptid: data.deptid,
            deptname: data.deptname,
            userid: data.userid,
            name: data.name,
            email: data.email,
            requestor_name: data.requestor_name,
            requestor_type: data.requestor_type,
            requestor_email: data.requestor_email,
            cc: data.cc,
            date: data.date,
            subject: data.subject,
            status: data.status,
            priority: data.priority,
            admin: data.admin,
            lastreply: data.lastreply,
            flag: data.flag,
            service: data.service,
            replies,
            notes,
        });

    } catch (error: any) {
        console.error("GET /api/whmcs/tickets/[ticketid] error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
