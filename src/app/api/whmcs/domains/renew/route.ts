// src/app/api/whmcs/domains/renew/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";
import { z } from "zod";

const domainRenewSchema = z.object({
    domainId: z.union([z.string(), z.number()]).transform(val => String(val)),
    years: z.union([z.string(), z.number()]).transform(val => Number(val)).optional().default(1),
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

        const parsed = domainRenewSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Domain ID required" }, { status: 400 });
        }

        const { domainId, years } = parsed.data;

        const result = await callWhmcsApi("DomainRenew", {
            domainid: String(domainId),
            regperiod: String(years ?? 1),
        });

        return NextResponse.json({ success: true, orderId: result.orderid ?? null });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
