// src/app/api/whmcs/tickets/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsTickets } from "@/lib/whmcs/support/getTickets";
import { z } from "zod";

const getTicketsQuerySchema = z.object({
    status: z.string().optional(),
    limitstart: z.coerce.number().int().nonnegative().optional(),
    limitnum: z.coerce.number().int().positive().optional(),
    deptid: z.coerce.number().int().positive().optional(),
    subject: z.string().optional(),
});

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
        const queryObj = {
            status: searchParams.get("status") || undefined,
            limitstart: searchParams.get("limitstart") || undefined,
            limitnum: searchParams.get("limitnum") || undefined,
            deptid: searchParams.get("deptid") || undefined,
            subject: searchParams.get("subject") || undefined,
        };

        const parsed = getTicketsQuerySchema.safeParse(queryObj);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { status, limitstart, limitnum, deptid, subject } = parsed.data;

        const data = await getWhmcsTickets({
            clientid: whmcsClientId,
            status,
            limitstart,
            limitnum,
            deptid,
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
