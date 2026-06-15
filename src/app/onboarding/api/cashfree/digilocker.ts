// app/onboarding/api/cashfree/digilocker.ts
// All frontend API calls related to DigiLocker (Aadhaar) verification

import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";

export interface AddressData {
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
}

export interface DigiLockerStatusResult {
    verified: boolean;
    address?: AddressData;
}

/**
 * Initiates DigiLocker OAuth flow.
 * Opens a popup window for the user to authenticate with DigiLocker.
 */
export const initiateDigiLocker = async (onboardingId: string | null): Promise<void> => {
    const loadingToast = toast.loading("Initializing DigiLocker verification...");

    try {
        if (onboardingId) localStorage.setItem("onboardingId", onboardingId);

        const res = await apiFetch("/api/verify/digilocker/initiate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ onboardingId }),
        });

        const result = await res.json();

        if (result?.token) {
            sessionStorage.setItem("dl_token", result.token);
        }

        toast.dismiss(loadingToast);

        if (!result?.url) {
            toast.error(result.error || "Failed to initiate DigiLocker");
            return;
        }

        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        window.open(
            result.url,
            "digilocker",
            `width=${width},height=${height},left=${left},top=${top}`
        );

        toast.success("Complete verification in the popup window");
    } catch (error) {
        console.error(error);
        toast.dismiss(loadingToast);
        toast.error("Failed to start DigiLocker verification");
    }
};

/**
 * Polls DigiLocker verification status by verificationId.
 * Resolves when status is SUCCESS or max attempts are reached.
 */
export const checkDigiLockerStatus = async (
    verificationId: string
): Promise<DigiLockerStatusResult> => {
    const token = sessionStorage.getItem("dl_token");
    if (!token) {
        console.error("DigiLocker token missing");
        throw new Error("Session expired. Please retry verification.");
    }
    const res = await apiFetch(`/api/verify/digilocker/status?id=${verificationId}&token=${token}`);
    const data = await res.json();

    if (data.status === "SUCCESS") {
        sessionStorage.removeItem("dl_token");
        let address: AddressData | undefined = undefined;

        if (data.address) {
            const fullStreet = [
                data.address.house,
                data.address.street,
                data.address.landmark,
                data.address.locality,
            ]
                .filter(Boolean)
                .join(", ");

            address = {
                streetAddress: fullStreet,
                city: data.address.vtc || data.address.dist || "",
                state: data.address.state || "",
                postalCode: data.address.pincode || "",
            };
        }

        return { verified: true, address };
    }

    return { verified: false };
};
