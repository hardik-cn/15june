// src/app/api/whmcs/domains/update-nameservers/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";

export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { domainId, nameservers } = body;

        if (!domainId || !nameservers?.length) {
            return NextResponse.json({ error: "Domain ID and nameservers are required" }, { status: 400 });
        }

        const params: any = { domainid: String(domainId) };
        nameservers.forEach((ns: string, idx: number) => {
            if (ns) params[`ns${idx + 1}`] = ns;
        });

        await callWhmcsApi("DomainUpdateNameservers", params);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
