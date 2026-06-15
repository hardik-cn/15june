// src/lib/kyc/KycContext.tsx
"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { apiFetch } from "@/lib/apiFetch";

type PopupType =
    | "required"
    | "review"
    | null;

type OnboardingData = {
    onboardingStatus: string | null;
    onboardingUuid: string | null;
    kycStatus: string | null;
};

interface KycContextType {
    popupType: PopupType;
    openPopup: (type: PopupType) => void;
    closePopup: () => void;
    isDismissed: boolean;

    // User statuses
    onboardingStatus: string | null;
    onboardingUuid: string | null;
    kycStatus: string | null;
    loading: boolean;
    refreshKycStatus: () => Promise<void>;
}

const KycContext =
    createContext<KycContextType | null>(null);

export function KycProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [popupType, setPopupType] = useState<PopupType>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        onboardingStatus: null,
        onboardingUuid: null,
        kycStatus: null,
    });
    const [loading, setLoading] = useState(true);

    const openPopup = (type: PopupType) => {
        setPopupType(type);
        setIsDismissed(false);
    };

    const closePopup = () => {
        setPopupType(null);
        setIsDismissed(true);
    };

    const fetchStatus = useCallback(async () => {
        try {
            const response = await apiFetch("/api/user/onboarding-status");
            if (response.ok) {
                const data = await response.json();
                setOnboardingData(data);
            }
        } catch (error) {
            console.error("Failed to fetch onboarding status in context:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;
        if (isAuthenticated) {
            fetchStatus();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, authLoading, fetchStatus]);

    return (
        <KycContext.Provider
            value={{
                popupType,
                openPopup,
                closePopup,
                isDismissed,
                onboardingStatus: onboardingData.onboardingStatus,
                onboardingUuid: onboardingData.onboardingUuid,
                kycStatus: onboardingData.kycStatus,
                loading,
                refreshKycStatus: async () => {
                    setIsDismissed(false);
                    await fetchStatus();
                },
            }}
        >
            {children}
        </KycContext.Provider>
    );
}

export function useKycPopup() {
    const context = useContext(KycContext);

    if (!context) {
        throw new Error(
            "useKycPopup must be used inside KycProvider"
        );
    }

    return context;
}