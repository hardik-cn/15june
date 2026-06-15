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
        const cookieStore = await cookies();

        // Get admin info before logout
        const admin = await getAdminFromRequest(req);

        const refreshToken = cookieStore.get("admin_refresh_token")?.value;

        if (refreshToken) {
            try {
                const payload = jwt.verify(
                    refreshToken,
                    process.env.REFRESH_TOKEN_SECRET!
                ) as { userId: number };

                const refreshHash = crypto
                    .createHash("sha256")
                    .update(refreshToken)
                    .digest("hex");

                await db.adminSession.deleteMany({
                    where: {
                        adminId: payload.userId,
                        refreshHash,
                    },
                });
            } catch {
                // invalid token
            }
        }

        cookieStore.delete("admin_refresh_token");
        cookieStore.delete("csrf_token");
        cookieStore.delete("2fa_temp_session");

        if (admin) {
            const userAgent =
                req.headers.get("user-agent") ?? "unknown";

            const ipAddress =
                req.headers.get("x-forwarded-for") ??
                req.headers.get("x-real-ip") ??
                "unknown";

            const { device, browser } =
                parseDeviceInfo(userAgent);

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

        return NextResponse.json({
            success: true,
            message: "Logged out successfully",
        });

    } catch (error) {
        console.error("Logout Error:", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
