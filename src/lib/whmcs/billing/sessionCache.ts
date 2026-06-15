export function getSessionCache<T>(
    key: string,
    maxAge: number
): T | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);

        if (Date.now() - parsed.timestamp > maxAge) {
            sessionStorage.removeItem(key);
            return null;
        }

        return parsed.data as T;

    } catch {
        return null;
    }
}

export function setSessionCache(
    key: string,
    data: any
) {
    if (typeof window === "undefined") {
        return;
    }

    sessionStorage.setItem(
        key,
        JSON.stringify({
            data,
            timestamp: Date.now(),
        })
    );
}