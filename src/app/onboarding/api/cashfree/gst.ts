// app/onboarding/api/cashfree/gst.ts
// Frontend API call for GST verification via Cashfree

import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";
import { AddressData } from "./digilocker";

export interface GSTVerificationResult {
    success: boolean;
    gstAddress?: AddressData;
    companyName?: string;
    error?: string;
}

/**
 * Verifies a GST number and returns address + company name if successful.
 */
export const verifyGST = async (gstNumber: string): Promise<GSTVerificationResult> => {
    if (!gstNumber) {
        toast.error("Please enter GST number first");
        return { success: false };
    }

    const loadingToast = toast.loading("Verifying GST...");

    try {
        const res = await apiFetch("/api/verify/gst", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gstNumber }),
        });

        const data = await res.json();
        toast.dismiss(loadingToast);

        if (data.success) {
            let gstAddress: AddressData | undefined = undefined;

            if (data.splitAddress) {
                const s = data.splitAddress;

                const fullStreet = [
                    s.flat_number,
                    s.building_number,
                    s.building_name,
                    s.street,
                    s.location,
                ]
                    .filter(Boolean)
                    .join(", ");

                gstAddress = {
                    streetAddress: fullStreet,
                    city: s.city || s.district || "",
                    state: s.state || "",
                    postalCode: s.pincode || "",
                };
            }

            const companyName =
                data.tradeName || data.legalName || undefined;

            toast.success("GST verified! Address fetched.");
            return { success: true, gstAddress, companyName };
        } else {
            toast.error(data.error || "GST verification failed");
            return { success: false, error: data.error };
        }
    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error("GST verification failed");
        return { success: false, error: "Network error" };
    }
};
