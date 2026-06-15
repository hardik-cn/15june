// src/lib/whmcs/billing/uuidMapping.ts
import crypto from "crypto";
import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "data", "invoice-uuid-map.json");

let UUID_MAP: Record<string, string> = {};

// Load from file on startup
function loadMap() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, "utf-8");
            UUID_MAP = JSON.parse(data);
        }
    } catch (e) {
        console.error("Failed to load UUID map:", e);
        UUID_MAP = {};
    }
}

// Save to file
function saveMap() {
    try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CACHE_FILE, JSON.stringify(UUID_MAP, null, 2));
    } catch (e) {
        console.error("Failed to save UUID map:", e);
    }
}

// Load on module import
loadMap();

export function getOrCreateInvoiceUuid(realId: string): string {
    if (!realId) throw new Error("realId is required");

    if (UUID_MAP[realId]) {
        return UUID_MAP[realId];
    }

    const uuid = crypto.randomUUID();

    UUID_MAP[realId] = uuid;
    UUID_MAP[uuid] = realId;

    saveMap(); // Persist immediately
    return uuid;
}

export function getRealInvoiceId(uuid: string): string | null {
    if (!uuid) return null;
    return UUID_MAP[uuid] || null;
}

export function clearInvoiceUuidCache() {
    UUID_MAP = {};
    if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
    }
}