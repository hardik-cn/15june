// src/lib/admin/adminFetch.ts

import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth/tokenStore";
import { getCSRFToken } from "@/lib/csrf";
import { toast } from "sonner";

interface AdminFetchOptions extends RequestInit {
    skipAuth?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;
let refreshFailed = false;
let redirectingToLogin = false;
let sessionExpiredShown = false;

// =============================
// REFRESH ACCESS TOKEN
// =============================
async function doRefresh(): Promise<string | null> {
    if (refreshFailed) {
        return null;
    }

    try {
        // =============================
        // STEP 1: REQUEST NEW ACCESS TOKEN
        // =============================
        const refreshRes = await fetch("/api/admin/refresh", {
            method: "POST",
            credentials: "include",
        });

        // =============================
        // STEP 2: STORE NEW ACCESS TOKEN
        // =============================
        if (refreshRes.ok) {
            const data = await refreshRes.json();

            if (data.accessToken) {
                setAccessToken(data.accessToken);

                refreshFailed = false;
                sessionExpiredShown = false;

                return data.accessToken;
            }
        }

        // =============================
        // STEP 3: HANDLE REFRESH FAILURE
        // =============================
        refreshFailed = true;

        if (!sessionExpiredShown) {
            sessionExpiredShown = true;

            toast.error(
                "Your session has expired. Please login again."
            );
        }

        clearAccessToken();

        // =============================
        // STEP 4: REDIRECT TO LOGIN
        // =============================
        if (typeof window !== "undefined" && !redirectingToLogin) {
            redirectingToLogin = true;

            const currentPath = window.location.pathname;

            if (!currentPath.includes("/admin/login")) {
                window.location.href = "/admin/login";
            }
        }

        return null;

    } catch (err) {
        // =============================
        // STEP 5: HANDLE REFRESH ERRORS
        // =============================
        console.error("[ADMIN_FETCH_REFRESH_ERROR]", err);

        refreshFailed = true;

        if (!sessionExpiredShown) {
            sessionExpiredShown = true;

            toast.error(
                "Your session has expired. Please login again."
            );
        }

        return null;
    }
}

export async function adminFetch(url: string, options: AdminFetchOptions = {}) {
    const isInternal = url.startsWith("/") || (typeof window !== "undefined" && url.startsWith(window.location.origin));
    const headers = new Headers(options.headers || {});
    const csrfMethods = ["POST", "PUT", "PATCH", "DELETE"];
    const needsCSRF = csrfMethods.includes((options.method || "GET").toUpperCase());

    // =============================
    // STEP 1: SET CONTENT TYPE
    // =============================
    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
        if (!headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
    }

    // =============================
    // STEP 2: GET ACCESS TOKEN (refresh BEFORE csrf is read)
    // =============================
    let token = getAccessToken();
    if (!token && isInternal && !options.skipAuth) {
        if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => {
                refreshPromise = null;
            });
        }
        token = await refreshPromise;
    }
    if (token && isInternal && !options.skipAuth) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // =============================
    // STEP 3: FETCH CSRF TOKEN — *after* any refresh, right before send
    // =============================
    if (needsCSRF) {
        const csrfToken = await getCSRFToken();
        if (csrfToken) headers.set("X-CSRF-Token", csrfToken);
    }

    // =============================
    // STEP 4: SEND REQUEST
    // =============================
    let response = await fetch(url, { ...options, headers });

    // =============================
    // STEP 5: HANDLE 401 — refresh AND re-fetch csrf before retry
    // =============================
    if (response.status === 401 && isInternal && !options.skipAuth) {
        if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => {
                refreshPromise = null;
            });
        }
        const newToken = await refreshPromise;

        if (newToken) {
            const retryHeaders = new Headers(headers);
            retryHeaders.set("Authorization", `Bearer ${newToken}`);

            if (needsCSRF) {
                const freshCsrf = await getCSRFToken(); // re-fetch, refresh may have rotated it
                if (freshCsrf) retryHeaders.set("X-CSRF-Token", freshCsrf);
            }

            response = await fetch(url, { ...options, headers: retryHeaders });
        }
    }

    return response;
}