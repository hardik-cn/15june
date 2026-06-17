// src/app/api/auth/active-sessions/route.ts
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { z } from "zod";

const deleteSessionSchema = z.object({
    sessionId: z.string().uuid("Invalid session ID format"),
});

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all active sessions for this user
        const sessions = await db.session.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        // Identify the current session from the cookies
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("refresh_token")?.value;
        let currentSessionId = null;

        if (refreshToken) {
            const hash = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            const currentSession = await db.session.findFirst({
                where: { refreshHash: hash }
            });

            if (currentSession) {
                currentSessionId = currentSession.id;
            }
        }

        // Map sessions, including isCurrent flag
        const mappedSessions = sessions.map(session => ({
            id: session.id,
            deviceName: session.deviceName || "Unknown Device",
            userAgent: session.userAgent || "Unknown User Agent",
            ipAddress: session.ipAddress || "Unknown IP",
            expiresAt: session.expiresAt,
            lastActivity: session.lastActivity,
            createdAt: session.createdAt,
            isCurrent: session.id === currentSessionId
        }));

        return NextResponse.json({ sessions: mappedSessions });

    } catch (error) {
        console.error("GET Active Sessions error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");

        const parsed = deleteSessionSchema.safeParse({ sessionId });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid session ID",
                    details: parsed.error.flatten()
                },
                { status: 400 }
            );
        }

        const { sessionId: validatedSessionId } = parsed.data;

        // Make sure session belongs to the current user
        const session = await db.session.findFirst({
            where: {
                id: validatedSessionId,
                userId: user.id
            }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Check if it's the current session
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("refresh_token")?.value;
        let isCurrent = false;

        if (refreshToken) {
            const hash = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            if (session.refreshHash === hash) {
                isCurrent = true;
            }
        }

        // Delete session from DB
        await db.session.delete({
            where: {
                id: validatedSessionId
            }
        });

        const response = NextResponse.json({ success: true, isCurrent });

        // If the user terminated their current session, clear their refresh cookie too
        if (isCurrent) {
            response.cookies.set("refresh_token", "", {
                httpOnly: true,
                path: "/",
                expires: new Date(0),
            });
        }

        return response;

    } catch (error) {
        console.error("DELETE Active Sessions error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
