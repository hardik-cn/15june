// app/api/admin/refresh/route.ts

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function POST(req: Request) {

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("admin_refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {

        const payload: any = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET!
        );

        const hash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await db.adminSession.findFirst({
            where: {
                adminId: payload.userId,
                refreshHash: hash
            }
        });

        if (!session) {
            return NextResponse.json(
                { error: "Token reuse detected" },
                { status: 401 }
            );
        }

        // create new refresh token
        const newRefresh = createRefreshToken(payload.userId);

        const newHash = crypto
            .createHash("sha256")
            .update(newRefresh)
            .digest("hex");

        await db.adminSession.update({
            where: { sessionId: session.sessionId },
            data: {
                refreshHash: newHash
            }
        });

        // new access token
        const accessToken = createAccessToken(payload.userId);

        const res = NextResponse.json({ accessToken });

        res.cookies.set("admin_refresh_token", newRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 24 * 60 * 60, // 24 hours
        });

        return res;

    } catch {

        return NextResponse.json(
            { error: "Invalid refresh token" },
            { status: 401 }
        );

    }
}

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        return NextResponse.json({ message: "Refresh endpoint is active" });
    } catch (error) {
        console.error("Refresh GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
