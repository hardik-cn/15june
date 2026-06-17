import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { callWhmcsApi } from "@/lib/whmcs";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { z } from "zod";

const inviteUserSchema = z.object({
    email: z.string().email("Invalid email format"),
    permissions: z.string().optional().nullable(),
});

export async function POST(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const fullUser = await db.user.findUnique({
            where: { id: user.id },
            include: {
                onboarding: true,
            },
        });

        const clientId = fullUser?.onboarding?.whmcsClientId;

        if (!clientId) {
            return NextResponse.json({ error: "No WHMCS client ID found" }, { status: 400 });
        }

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const parsed = inviteUserSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { email, permissions } = parsed.data;

        // ── 1. Send invite via WHMCS ─────────────────────────────────────────
        const result = await callWhmcsApi("CreateClientInvite", {
            client_id: clientId,
            email,
            permissions: permissions ?? "",
        });

        // ── 2. Save to our local DB so we can show pending invites ───────────
        await db.userInvitation.upsert({
            where: {
                whmcsClientId_email: {
                    whmcsClientId: clientId,
                    email,
                },
            },
            create: {
                whmcsClientId: clientId,
                email,
                permissions: permissions ?? "",
            },
            update: {
                permissions: permissions ?? "",
                sentAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, result });

    } catch (error: any) {
        console.error("INVITE ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}