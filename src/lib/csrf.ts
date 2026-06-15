// src/lib/csrf.ts

let csrfToken: string | null = null;

export async function getCSRFToken() {
    if (csrfToken) {
        return csrfToken;
    }

    const res = await fetch("/api/csrf", {
        credentials: "include",
    });

    const data = await res.json();

    csrfToken = data.csrfToken;

    return csrfToken;
}