// src/app/api/whmcs/domains/toggle-autorenew/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";
import { z } from "zod";

const domainToggleAutorenewSchema = z.object({
    domainId: z.union([z.string(), z.number()]).transform(val => String(val)),
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

        const parsed = domainToggleAutorenewSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Domain ID required" }, { status: 400 });
        }

        const { domainId } = parsed.data;

        await callWhmcsApi("UpdateClientDomain", {
            domainid: String(domainId),
            autorenew: "toggle",
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
