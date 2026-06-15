// src/lib/userActivityLog.ts
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

interface UserActivityLogData {
    logAction: string;
    logMessage: string;
    rawData?: Prisma.InputJsonValue | null;
    userId?: number | null;
    username?: string | null;
    email?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    device?: string | null;
    browser?: string | null;
    status?: string;
}

/**
 * Extract IP address from request headers
 */
export function getIpFromRequest(req: Request): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

/**
 * Extract user agent from request headers
 */
export function getUserAgentFromRequest(req: Request): string {
    return req.headers.get("user-agent") || "unknown";
}

/**
 * Detect a simple browser name from the user-agent string
 */
export function detectBrowser(userAgent: string): string {
    if (!userAgent || userAgent === "unknown") return "Unknown";
    if (userAgent.includes("Edg/")) return "Edge";
    if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) return "Chrome";
    if (userAgent.includes("Firefox/")) return "Firefox";
    if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";
    if (userAgent.includes("Opera/") || userAgent.includes("OPR/")) return "Opera";
    return "Other";
}

/**
 * Detect a simple device type from the user-agent string
 */
export function detectDeviceType(userAgent: string): string {
    if (!userAgent || userAgent === "unknown") return "Unknown";
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) return "Mobile";
    if (/Tablet|iPad/i.test(userAgent)) return "Tablet";
    return "Desktop";
}

/**
 * Log a user activity to the database (fire-and-forget, non-blocking).
 * Errors are caught and logged to console so they never break the main flow.
 */
export async function logUserActivity(data: UserActivityLogData): Promise<void> {
    try {
        await db.userActivityLog.create({
            data: {
                logAction: data.logAction,
                logMessage: data.logMessage,
                rawData: data.rawData ?? undefined,
                userId: data.userId ?? null,
                username: data.username ?? null,
                email: data.email ?? null,
                ipAddress: data.ipAddress ?? null,
                userAgent: data.userAgent ?? null,
                device: data.device ?? null,
                browser: data.browser ?? null,
                status: data.status ?? "success",
            },
        });
    } catch (error) {
        console.error("Failed to log user activity:", error);
    }
}

/**
 * Convenience: Extract request metadata and log a user activity in one call.
 */
export async function logUserActivityFromRequest(
    req: Request,
    data: Omit<UserActivityLogData, "ipAddress" | "userAgent" | "device" | "browser">
): Promise<void> {
    const ipAddress = getIpFromRequest(req);
    const userAgent = getUserAgentFromRequest(req);
    const device = detectDeviceType(userAgent);
    const browser = detectBrowser(userAgent);

    return logUserActivity({
        ...data,
        ipAddress,
        userAgent,
        device,
        browser,
    });
}
