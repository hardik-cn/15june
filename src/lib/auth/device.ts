// src/lib/auth/device.ts
import { UAParser } from "ua-parser-js";

export function detectDevice(userAgent: string) {

    const parser = new UAParser(userAgent);

    const device = parser.getDevice().type || "desktop";
    const browser = parser.getBrowser().name;
    const os = parser.getOS().name;

    return `${device} | ${browser} | ${os}`;
}