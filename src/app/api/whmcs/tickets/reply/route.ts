import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { z } from "zod";

const replyTicketSchema = z.object({
    ticketid: z.string().min(1, "Ticket ID is required"),
    message: z.string().min(1, "Message is required"),
});

export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const formData = await req.formData();
        const ticketidRaw = formData.get("ticketid") as string;
        const messageRaw = formData.get("message") as string;
        const clientid = user.whmcsClientId;

        const parsed = replyTicketSchema.safeParse({
            ticketid: ticketidRaw,
            message: messageRaw,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const { ticketid, message } = parsed.data;

        const files = formData.getAll("attachments") as File[];
        
        const attachmentsData = await Promise.all(
            files.map(async (file) => {
                const buffer = await file.arrayBuffer();
                const base64 = Buffer.from(buffer).toString("base64");
                return {
                    name: file.name,
                    data: base64,
                };
            })
        );

        const params = new URLSearchParams({
            action: "AddTicketReply",
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            ticketid,
            message,
            clientid: String(clientid),
            markdown: "true",
            responsetype: "json",
        });

        if (attachmentsData.length > 0) {
            const jsonAttachments = JSON.stringify(attachmentsData);
            const base64Attachments = Buffer.from(jsonAttachments).toString("base64");
            params.append("attachments", base64Attachments);
        }

        const res = await fetch(process.env.WHMCS_API_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });

        const result = await res.json();
        if (result.result !== "success") {
            return NextResponse.json({ error: result.message || "Failed to add reply" }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("AddTicketReply error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
