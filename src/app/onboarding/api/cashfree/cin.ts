// app/onboarding/api/cashfree/cin.ts
// Frontend API call for CIN verification via Cashfree

import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";

export interface CINVerificationResult {
    success: boolean;
    error?: string;
}

/**
 * Verifies a CIN number (must be exactly 21 alphanumeric characters).
 */
export const verifyCIN = async (cinNumber: string): Promise<CINVerificationResult> => {
    if (!/^[A-Z0-9]{21}$/.test(cinNumber)) {
        toast.error("Enter a valid 21-character CIN");
        return { success: false };
    }

    const loadingToast = toast.loading("Verifying CIN...");

    try {
        const res = await apiFetch("/api/verify/cin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cinNumber }),
        });

        const data = await res.json();
        toast.dismiss(loadingToast);

        if (data.success) {
            toast.success("CIN verified successfully");
            return { success: true };
        } else {
            toast.error(data.error || "CIN verification failed");
            return { success: false, error: data.error };
        }
    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("CIN verification failed");
        return { success: false, error: "Network error" };
    }
};
