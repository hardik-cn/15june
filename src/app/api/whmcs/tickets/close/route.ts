import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";
import { z } from "zod";

const closeTicketSchema = z.object({
  ticketid: z.union([z.string(), z.number()]).transform(val => String(val)),
});

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = closeTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
    }

    const { ticketid } = parsed.data;

    const result = await callWhmcsApi("UpdateTicket", {
      ticketid: String(ticketid),
      status: "Closed",
    });

    if (result.result !== "success") {
      return NextResponse.json(
        { error: result.message || "Failed to close ticket" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CloseTicket error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
