// app/onboarding/api/didit/didit.ts
// All frontend API calls related to Didit identity verification (non-Indian users)

import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";

export type DiditStatus =
    | "Not Started"
    | "Pending"
    | "In Review"
    | "Approved"
    | "Declined";

export interface DiditInitiateResult {
    sessionId?: string;
    url?: string;
    popup?: Window | null;
    error?: string;
}

export interface DiditStatusResult {
    status: DiditStatus;
}

/**
 * Initiates a Didit verification session and opens the verification URL in a popup.
 * Returns the session ID and URL on success, or an error message on failure.
 */
export const initiateDidit = async (
    onboardingId: string | null,
    expectedName: string
): Promise<DiditInitiateResult> => {
    if (!expectedName.trim()) {
        toast.error("Please enter your full name as per document");
        return {};
    }

    const loadingToast = toast.loading("Initializing Didit verification...");

    try {
        const res = await apiFetch("/api/verify/didit/initiate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                onboardingId,
                expectedName: expectedName.trim(),
            }),
        });

        const result = await res.json();
        toast.dismiss(loadingToast);

        if (!result?.url) {
            toast.error(result.error || "Failed to initiate Didit verification");
            return { error: result.error || "No URL returned" };
        }

        if (result.sessionId) {
            localStorage.setItem("diditSessionId", result.sessionId);
            localStorage.setItem("diditStatus", "Pending");
        }

        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            result.url,
            "didit",
            `width=${width},height=${height},left=${left},top=${top}`
        );

        if (!popup) {
            toast.error("Popup blocked. Please allow popups to verify identity.");
            return { error: "Popup blocked" };
        }

        toast.success("Complete verification in the popup window");

        return { sessionId: result.sessionId, url: result.url, popup };

    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("Failed to start Didit verification");
        return { error: "Network error" };
    }
};

/**
 * Polls the Didit session status from the backend.
 */
export const pollDiditStatus = async (
    sessionId: string
): Promise<DiditStatusResult | null> => {
    try {
        const res = await apiFetch(`/api/verify/didit/status?sessionId=${sessionId}`);
        if (!res.ok) return null;

        const data = await res.json();
        return { status: data.status as DiditStatus };
    } catch (err) {
        console.error("[Didit poll] fetch error:", err);
        return null;
    }
};

/**
 * Deletes an abandoned Didit session via our backend.
 * Called when the user closes the popup without completing verification.
 */
export const deleteDiditSession = async (sessionId: string): Promise<void> => {
    try {
        await apiFetch("/api/verify/didit/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
        });
    } catch (err) {
        console.warn("[Didit] deleteSession fetch error:", err);
    }
};
