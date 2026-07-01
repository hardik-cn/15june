// app/api/verify/didit/delete/route.ts
//
// Deletes an abandoned Didit session so a fresh one can be created.
// Called when the user closes the popup without completing verification.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteDiditSession } from "@/lib/didit";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function DELETE(req: NextRequest) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // ── Request body ──────────────────────────────────────────────────────
        const body = await req.json().catch(() => ({}));
        const sessionId: string | undefined = body.sessionId;

        if (!sessionId) {
            return NextResponse.json(
                { error: "sessionId is required" },
                { status: 400 }
            );
        }

        // ── Verify the session belongs to this user ───────────────────────────
        const session = await db.diditSession.findFirst({
            where: {
                sessionId,
                userId: user.id,
            },
        });

        if (!session) {
            // Either doesn't exist or belongs to a different user — treat as OK
            return NextResponse.json({ success: true });
        }

        // ── Only delete if session is still in a non-terminal state ──────────
        const terminalStatuses = ["Approved", "In Review", "Declined"];
        if (terminalStatuses.includes(session.status)) {
            // Don't delete sessions that already have a decision
            return NextResponse.json({ success: true, skipped: true });
        }

        // ── Call Didit API to delete the session ──────────────────────────────
        await deleteDiditSession(sessionId).catch((err) => {
            // Log but don't fail – the DB cleanup below is more important
            console.warn("[didit/delete] Didit API delete failed:", err.message);
        });

        // ── Mark session as deleted in our DB ────────────────────────────────
        await db.diditSession.update({
            where: { sessionId },
            data: {
                status: "Deleted",
                updatedAt: getISTDateWithOffset(0)
            },
        }).catch(() => {
            // If status column doesn't allow "Deleted", just ignore
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[didit/delete]", err);
        return NextResponse.json(
            {
                success: false,
                error: err.message || "Failed to delete session",
            },
            { status: 500 }
        );
    }
}
