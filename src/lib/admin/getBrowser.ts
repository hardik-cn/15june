// src/lib/admin/getBrowser.ts

// =============================
// BROWSER TYPES
// =============================
type BrowserName =
    | "chrome"
    | "edge"
    | "firefox"
    | "safari"
    | "opera"
    | "brave";

// =============================
// BROWSER CONFIG INTERFACE
// =============================
interface BrowserConfig {
    name: BrowserName;
    engine: "chromium" | "gecko" | "webkit";
}

// =============================
// GET BROWSER CONFIGURATION
// =============================
export function getBrowser(name: BrowserName = "chrome"): BrowserConfig {

    // =============================
    // STEP 1: HANDLE CHROMIUM BROWSERS
    // =============================
    switch (name) {
        case "chrome":
        case "edge":
        case "opera":
        case "brave":
            return { name, engine: "chromium" };

        // =============================
        // STEP 2: HANDLE FIREFOX
        // =============================
        case "firefox":
            return { name, engine: "gecko" };

        // =============================
        // STEP 3: HANDLE SAFARI
        // =============================
        case "safari":
            return { name, engine: "webkit" };

        // =============================
        // STEP 4: HANDLE UNSUPPORTED BROWSERS
        // =============================
        default:
            throw new Error("Unsupported browser" + name);
    }
}