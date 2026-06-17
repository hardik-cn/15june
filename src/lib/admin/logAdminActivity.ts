// src/lib/admin/logAdminActivity.ts

import { db } from "@/lib/db";
import { getISTDate } from "@/lib/getISTDate";

// =============================
// LOG ADMIN ACTIVITY
// =============================
export async function logAdminActivity({
    logAction,
    logMessage,
    userId = null,
    username = null,
    adminId = null,
    adminName = null,
    ipAddress = null,
    userAgent = null,
    device = null,
    browser = null,
    rawData = null,
}: {
    logAction: string;
    logMessage: string;
    userId?: number | null;
    username?: string | null;
    adminId?: number | null;
    adminName?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    device?: string | null;
    browser?: string | null;
    rawData?: object | null;
}) {
    try {
        // =============================
        // STEP 1: PREPARE ACTIVITY LOG
        // =============================
        const activityData = {
            logAction,
            logMessage,
            userId,
            username,
            adminId,
            adminName,
            ipAddress,
            userAgent,
            device,
            browser,
            rawData: rawData ? JSON.stringify(rawData) : undefined,
            createdAt: getISTDate(),
        };

        // =============================
        // STEP 2: SAVE ACTIVITY LOG
        // =============================
        await db.adminActivityLog.create({
            data: activityData,
        });

    } catch (error) {
        console.error("LOG_ERROR:", error);
    }
}