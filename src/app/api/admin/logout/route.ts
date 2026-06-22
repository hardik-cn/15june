// src/app/api/admin/logout/route.ts

import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: GET CURRENT ADMIN SESSION
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cookieStore = await cookies();
        const refreshToken = cookieStore.get("admin_refresh_token")?.value;

        // =============================
        // STEP 2: REMOVE ACTIVE SESSION
        // =============================
        if (refreshToken) {
            try {
                const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as { userId: number };

                const refreshHash = crypto
                    .createHash("sha256")
                    .update(refreshToken)
                    .digest("hex");

                await db.adminSession.deleteMany({
                    where: { adminId: payload.userId, refreshHash }
                });

            } catch {
                // Ignore invalid or expired refresh tokens
            }
        }

        // =============================
        // STEP 3: CLEAR AUTH COOKIES
        // =============================
        cookieStore.delete("admin_refresh_token");
        cookieStore.delete("csrf_token");
        // cookieStore.delete("2fa_temp_session");

        // =============================
        // STEP 4: LOG LOGOUT ACTIVITY
        // =============================
        if (admin) {
            const userAgent = req.headers.get("user-agent") ?? "unknown";
            const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
            const { device, browser } = parseDeviceInfo(userAgent);

            // return { userAgent, ipAddress, device, browser }; 

            await logAdminActivity({
                logAction: "LOGOUT_SUCCESS",
                logMessage: "logged out successfully",
                adminId: admin.id,
                adminName: `${admin.first_name} ${admin.last_name}`,
                ipAddress,
                userAgent,
                device,
                browser,
            });
        }

        // =============================
        // STEP 5: RETURN LOGOUT RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}