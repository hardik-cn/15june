// src/app/api/whmcs/domains/update-nameservers/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";
import { z } from "zod";

const updateNameserversSchema = z.object({
    domainId: z.union([z.string(), z.number()]).transform(val => String(val)),
    nameservers: z.array(z.string()).min(1, "At least one nameserver is required"),
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

        const parsed = updateNameserversSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Domain ID and nameservers are required" }, { status: 400 });
        }

        const { domainId, nameservers } = parsed.data;

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
