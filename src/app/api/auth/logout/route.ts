// src/app/api/auth/logout/route.ts
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("refresh_token")?.value;

        if (refreshToken) {
            const hash = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            await db.session.deleteMany({
                where: { refreshHash: hash },
            });
        }

        const response = NextResponse.json({ success: true });

        // Clear refresh token cookie
        response.cookies.set("refresh_token", "", {
            httpOnly: true,
            path: "/",
            expires: new Date(0),
        });

        return response;
    } catch (err) {
        console.error("Logout error:", err);
        return NextResponse.json(
            { error: "Logout failed" },
            { status: 500 }
        );
    }
}