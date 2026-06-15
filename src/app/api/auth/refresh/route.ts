// src/app/api/auth/refresh/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { createAccessToken, createRefreshToken } from "@/lib/auth/tokens";

export async function POST(req: Request) {

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

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

        const session = await db.session.findFirst({
            where: { refreshHash: hash }
        });

        if (!session) {
            return NextResponse.json(
                { error: "Invalid session" },
                { status: 401 }
            );
        }

        if (session.expiresAt < new Date()) {
            await db.session.delete({ where: { id: session.id } });

            return NextResponse.json(
                { error: "Session expired" },
                { status: 401 }
            );
        }

        const newRefresh = createRefreshToken(payload.userId);

        const newHash = crypto
            .createHash("sha256")
            .update(newRefresh)
            .digest("hex");

        await db.session.update({
            where: { id: session.id },
            data: {
                refreshHash: newHash,
                lastActivity: new Date(),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            }
        });

        const accessToken =
            createAccessToken(payload.userId);

        const res = NextResponse.json({ accessToken });

        res.cookies.set("refresh_token", newRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            // maxAge: 60 * 60, // 1 hour
        });

        return res;

    } catch {

        return NextResponse.json(
            { error: "Invalid refresh token" },
            { status: 401 }
        );

    }

}