// src/app/api/whmcs/domains/renew/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";

export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { domainId, years } = await req.json();
        if (!domainId) return NextResponse.json({ error: "Domain ID required" }, { status: 400 });

        const result = await callWhmcsApi("DomainRenew", {
            domainid: String(domainId),
            regperiod: String(years ?? 1),
        });

        return NextResponse.json({ success: true, orderId: result.orderid ?? null });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
