// app/onboarding/api/cashfree/pan.ts
// Frontend API call for PAN verification via Cashfree

import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";

export interface PANVerificationResult {
    success: boolean;
    error?: string;
}

/**
 * Verifies a PAN number (must be exactly 10 characters).
 */
export const verifyPAN = async (panNumber: string): Promise<PANVerificationResult> => {
    if (!panNumber || panNumber.length !== 10) {
        toast.error("Please enter a valid 10-character PAN number");
        return { success: false };
    }

    const loadingToast = toast.loading("Verifying PAN...");

    try {
        const res = await apiFetch("/api/verify/pan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ panNumber }),
        });

        const data = await res.json();
        toast.dismiss(loadingToast);

        if (!res.ok || !data.success) {
            toast.error(data.error || "PAN verification failed");
            return { success: false, error: data.error };
        }

        toast.success("PAN verified successfully!");
        return { success: true };
    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("PAN verification failed");
        return { success: false, error: "Network error" };
    }
};
