// src/app/api/whmcs/tickets/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsTickets } from "@/lib/whmcs/support/getTickets";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

        const whmcsClientId = user.whmcsClientId;
        if (!whmcsClientId) {
            return NextResponse.json(
                { error: "No WHMCS client linked" },
                { status: 404 }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || undefined;
        const limitstart = searchParams.get("limitstart");
        const limitnum = searchParams.get("limitnum");
        const deptid = searchParams.get("deptid");
        const subject = searchParams.get("subject") || undefined;

        const data = await getWhmcsTickets({
            clientid: whmcsClientId,
            status,
            limitstart: limitstart ? parseInt(limitstart, 10) : undefined,
            limitnum: limitnum ? parseInt(limitnum, 10) : undefined,
            deptid: deptid ? parseInt(deptid, 10) : undefined,
            subject,
            ignore_dept_assignments: true,
        });

        //  console.log(data);

        if (data.result !== "success") {
            return NextResponse.json(
                { error: "Failed to fetch tickets from WHMCS" },
                { status: 500 }
            );
        }

        // Normalize the tickets array (WHMCS returns nested structure)
        const tickets = data.tickets?.ticket || [];

        return NextResponse.json({
            totalresults: data.totalresults,
            startnumber: data.startnumber,
            numreturned: data.numreturned,
            tickets,
        });

    } catch (error: any) {
        console.error("GET /api/whmcs/tickets error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
