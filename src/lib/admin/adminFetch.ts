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
    // =============================
    // STEP 1: FETCH CSRF TOKEN
    // =============================
    const csrfToken = await getCSRFToken();

    // =============================
    // STEP 2: DETERMINE REQUEST TYPE
    // =============================
    const isInternal = url.startsWith("/") || (typeof window !== "undefined" && url.startsWith(window.location.origin));

    const headers = new Headers(options.headers || {});

    // =============================
    // STEP 3: ADD CSRF TOKEN
    // =============================
    const csrfMethods = [
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ];

    if (csrfToken && csrfMethods.includes((options.method || "GET").toUpperCase())) {
        headers.set("X-CSRF-Token", csrfToken);
    }

    // =============================
    // STEP 4: SET CONTENT TYPE
    // =============================
    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
        if (!headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
    }

    // =============================
    // STEP 5: GET ACCESS TOKEN
    // =============================
    let token = getAccessToken();

    // =============================
    // STEP 6: REFRESH TOKEN IF MISSING
    // =============================
    if (!token && isInternal && !options.skipAuth) {
        if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => {
                refreshPromise = null;
            });
        }

        token = await refreshPromise;
    }

    // =============================
    // STEP 7: ATTACH AUTHORIZATION HEADER
    // =============================
    if (token && isInternal && !options.skipAuth) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // =============================
    // STEP 8: SEND REQUEST
    // =============================
    let response = await fetch(url, {
        ...options,
        headers,
    });

    // =============================
    // STEP 9: HANDLE 401 RESPONSE
    // =============================
    if (response.status === 401 && isInternal && !options.skipAuth) {
        if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => {
                refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;

        // =============================
        // STEP 10: RETRY WITH NEW TOKEN
        // =============================
        if (newToken) {
            const retryHeaders = new Headers(headers);

            retryHeaders.set("Authorization", `Bearer ${newToken}`);

            response = await fetch(url, {
                ...options,
                headers: retryHeaders,
            });
        }
    }

    // =============================
    // STEP 11: RETURN RESPONSE
    // =============================
    return response;
}