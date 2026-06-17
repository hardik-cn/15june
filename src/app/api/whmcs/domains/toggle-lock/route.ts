// src/app/api/whmcs/domains/toggle-lock/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";
import { z } from "zod";

const domainToggleLockSchema = z.object({
    domainId: z.union([z.string(), z.number()]).transform(val => String(val)),
    lock: z.boolean(),
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

        const parsed = domainToggleLockSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Domain ID and lock status are required" }, { status: 400 });
        }

        const { domainId, lock } = parsed.data;

        await callWhmcsApi("DomainUpdateLockingStatus", {
            domainid: String(domainId),
            lockstatus: lock ? "locked" : "unlocked",
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
