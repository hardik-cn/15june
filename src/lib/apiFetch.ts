// src/lib/apiFetch.ts
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth/tokenStore";
import { getCSRFToken } from "@/lib/csrf";

export async function apiFetch(
    url: string,
    options: RequestInit = {}
) {

    const csrfToken = await getCSRFToken();
    let token = getAccessToken();

    // If token is missing, try to refresh once before making the request
    // to avoid the initial 401 error in the console.
    if (!token) {
        try {
            const refresh = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include",
            });

            if (refresh.ok) {
                const data = await refresh.json();
                setAccessToken(data.accessToken);
                token = data.accessToken;
            }
        } catch (error) {
            console.error("Initial token refresh failed", error);
        }
    }

    // Don't set a default Content-Type when body is FormData —
    // the browser must set it automatically so it includes the multipart boundary.
    const isFormData = options.body instanceof FormData;

    const headers: any = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
        "X-CSRF-Token": csrfToken,
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(url, {
        ...options,
        headers,
    });

    // =============================
    // ACCESS TOKEN EXPIRED (401)
    // =============================

    if (res.status === 401) {

        const refresh = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
        });

        if (!refresh.ok) {
            clearAccessToken();
            window.location.href = "/login";
            throw new Error("Session expired");
        }

        const data = await refresh.json();

        setAccessToken(data.accessToken);

        const retryHeaders: any = {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...options.headers,
            Authorization: `Bearer ${data.accessToken}`,
        };

        res = await fetch(url, {
            ...options,
            headers: retryHeaders,
        });
    }

    return res;
}
