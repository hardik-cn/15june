import { UAParser } from "ua-parser-js";

// export function detectDevice(userAgent: string): string {
//     const parser = new UAParser(userAgent);

//     const device = parser.getDevice().type ?? "Desktop";
//     const browser = parser.getBrowser().name ?? "unknown";
//     const os = parser.getOS().name ?? "unknown";

//     return `${device} | ${browser} | ${os}`;
// }

export function parseDeviceInfo(userAgent: string): {
    device: string;
    browser: string;
    os: string;
    deviceType: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
} {
    const parser = new UAParser(userAgent);

    const deviceType = parser.getDevice().type ?? "Desktop";
    const browser = parser.getBrowser().name ?? "unknown";
    const os = parser.getOS().name ?? "unknown";
    const osVersion = parser.getOS().version ?? "";
    const browserVersion = parser.getBrowser().version ?? "";

    const isMobile = deviceType === "mobile";
    const isTablet = deviceType === "tablet";
    const isDesktop = !isMobile && !isTablet;

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