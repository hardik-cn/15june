// src/app/api/admin/refresh/route.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { createAccessToken, createRefreshToken, } from "@/lib/auth/tokens";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function POST(req: Request) {
    // =============================
    // STEP 1: READ REFRESH TOKEN
    // =============================
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("admin_refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // =============================
        // STEP 2: VERIFY REFRESH TOKEN
        // =============================
        const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
            userId: number;
        };

        // =============================
        // STEP 3: VALIDATE SESSION
        // =============================
        const hash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const session =
            await db.adminSession.findFirst({
                where: {
                    adminId: payload.userId,
                    refreshHash: hash,
                },
            });

        if (!session) {
            return NextResponse.json({ error: "Token reuse detected" }, { status: 401 });
        }

        // =============================
        // STEP 4: ROTATE REFRESH TOKEN
        // =============================
        const newRefresh = createRefreshToken(payload.userId);
        const newHash = crypto.createHash("sha256").update(newRefresh).digest("hex");

        await db.adminSession.update({
            where: { sessionId: session.sessionId },
            data: {
                refreshHash: newHash
            },
        });

        // =============================
        // STEP 5: GENERATE ACCESS TOKEN
        // =============================
        const accessToken = createAccessToken(payload.userId);
        const res = NextResponse.json({ accessToken });

        // =============================
        // STEP 6: UPDATE REFRESH COOKIE
        // =============================
        res.cookies.set("admin_refresh_token", newRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 24 * 60 * 60,
        });

        return res;

    } catch {
        return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }
}

export async function GET(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: RETURN ENDPOINT STATUS
        // =============================
        return NextResponse.json({ message: "Refresh endpoint is active" });

    } catch (error) {
        console.error("Refresh GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}