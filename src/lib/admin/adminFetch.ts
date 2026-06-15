// lib/admin/adminFetch.ts

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

async function doRefresh(): Promise<string | null> {
    if (refreshFailed) {
        return null;
    }

    try {
        const refreshRes = await fetch("/api/admin/refresh", {
            method: "POST",
            credentials: "include",
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();

            if (data.accessToken) {
                setAccessToken(data.accessToken);

                refreshFailed = false;
                sessionExpiredShown = false;

                return data.accessToken;
            }
        }

        refreshFailed = true;

        if (!sessionExpiredShown) {
            sessionExpiredShown = true;

            toast.error(
                "Your session has expired. Please login again."
            );
        }

        clearAccessToken();

        if (
            typeof window !== "undefined" &&
            !redirectingToLogin
        ) {
            redirectingToLogin = true;

            const currentPath = window.location.pathname;

            if (!currentPath.includes("/admin/login")) {
                window.location.href = "/admin/login";
            }
        }

        return null;

    } catch (err) {
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

export async function adminFetch(
    url: string,
    options: AdminFetchOptions = {}
) {
    const csrfToken = await getCSRFToken();

    const isInternal =
        url.startsWith("/") ||
        (typeof window !== "undefined" &&
            url.startsWith(window.location.origin));

    const headers = new Headers(options.headers || {});

    const csrfMethods = [
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
    ];

    if (
        csrfToken &&
        csrfMethods.includes(
            (options.method || "GET").toUpperCase()
        )
    ) {
        headers.set("X-CSRF-Token", csrfToken);
    }

    if (
        options.body &&
        typeof options.body === "object" &&
        !(options.body instanceof FormData)
    ) {
        if (!headers.has("Content-Type")) {
            headers.set(
                "Content-Type",
                "application/json"
            );
        }
    }

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
        headers.set(
            "Authorization",
            `Bearer ${token}`
        );
    }

    let response = await fetch(url, {
        ...options,
        headers,
    });

    if (
        response.status === 401 &&
        isInternal &&
        !options.skipAuth
    ) {
        if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => {
                refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;

        if (newToken) {
            const retryHeaders = new Headers(headers);

            retryHeaders.set(
                "Authorization",
                `Bearer ${newToken}`
            );

            response = await fetch(url, {
                ...options,
                headers: retryHeaders,
            });
        }
    }

    return response;
}