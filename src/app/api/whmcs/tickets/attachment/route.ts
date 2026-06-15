import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const relatedid = searchParams.get("relatedid");
        const type = searchParams.get("type"); // ticket, reply, note
        const index = searchParams.get("index");

        if (!relatedid || !type || index === null) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        const params = new URLSearchParams({
            action: "GetTicketAttachment",
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            relatedid,
            type,
            index,
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
