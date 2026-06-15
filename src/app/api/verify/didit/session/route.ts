// app/api/verify/didit/session/route.ts
//
// Deletes a Didit session both from Didit's API and our DB.
// Called when the user closes the popup without completing verification.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

const DIDIT_API_BASE = "https://apx.didit.me/v2";

async function getDiditAccessToken(): Promise<string> {
    const res = await fetch("https://auth.didit.me/auth/realms/didit-app/protocol/openid-connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: process.env.DIDIT_CLIENT_ID!,
            client_secret: process.env.DIDIT_CLIENT_SECRET!,
        }),
    });
    if (!res.ok) throw new Error("Failed to get Didit access token");
    const data = await res.json();
    return data.access_token as string;
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        if (!sessionId) {
            return NextResponse.json(
                { error: "sessionId query param is required" },
                { status: 400 }
            );
        }

        // Verify this session belongs to the current user before deleting
        const record = await db.diditSession.findFirst({
            where: { sessionId, userId: user.id },
            select: { id: true },
        });

        if (!record) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // ── Delete from Didit API ─────────────────────────────────────────────────
        try {
            const token = await getDiditAccessToken();
            const diditRes = await fetch(`${DIDIT_API_BASE}/session/${sessionId}/`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            // 204 = deleted, 404 = already gone — both are fine
            if (!diditRes.ok && diditRes.status !== 404) {
                console.warn("[didit/session DELETE] Didit API returned", diditRes.status);
            }
        } catch (err) {
            // Don't block DB cleanup if the Didit API call fails
            console.warn("[didit/session DELETE] Could not reach Didit API:", err);
        }

        // ── Delete from our DB ────────────────────────────────────────────────────
        await db.diditSession.deleteMany({
            where: { sessionId, userId: user.id },
        });

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("[didit/session DELETE]", err);
        return NextResponse.json(
            { error: err.message || "Failed to delete session" },
            { status: 500 }
        );
    }
}