// src/lib/admin/device.ts

import { UAParser } from "ua-parser-js";

// export function detectDevice(userAgent: string): string {
//     const parser = new UAParser(userAgent);

//     const device = parser.getDevice().type ?? "Desktop";
//     const browser = parser.getBrowser().name ?? "unknown";
//     const os = parser.getOS().name ?? "unknown";

//     return `${device} | ${browser} | ${os}`;
// }

// =============================
// PARSE DEVICE INFORMATION
// =============================
export function parseDeviceInfo(userAgent: string): {
    device: string;
    browser: string;
    os: string;
    deviceType: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
} {
    // =============================
    // STEP 1: INITIALIZE UA PARSER
    // =============================
    const parser = new UAParser(userAgent);

    // =============================
    // STEP 2: EXTRACT DEVICE DETAILS
    // =============================
    const deviceType = parser.getDevice().type ?? "Desktop";
    const browser = parser.getBrowser().name ?? "unknown";
    const os = parser.getOS().name ?? "unknown";
    const osVersion = parser.getOS().version ?? "";
    const browserVersion = parser.getBrowser().version ?? "";

    // =============================
    // STEP 3: DETERMINE DEVICE TYPE
    // =============================
    const isMobile = deviceType === "mobile";
    const isTablet = deviceType === "tablet";
    const isDesktop = !isMobile && !isTablet;

    // =============================
    // STEP 4: FORMAT DEVICE RESPONSE
    // =============================
    return {
        device: `${deviceType} | ${os}${osVersion ? ` ${osVersion}` : ""}`,
        browser: browserVersion ? `${browser} ${browserVersion}` : browser,
        os: osVersion ? `${os} ${osVersion}` : os,
        deviceType,
        isMobile,
        isTablet,
        isDesktop,
    };
}