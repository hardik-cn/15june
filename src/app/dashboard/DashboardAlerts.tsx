// src/app/dashboard/DashboardAlerts.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, } from "@/app/components/ui/alert";
import { KYCPopup } from "@/app/components/dashboard/KYCPopup";
import { useKycPopup } from "@/lib/kyc/KycContext";

export default function DashboardAlerts() {

    const searchParams = useSearchParams();
    const { popupType, isDismissed, onboardingStatus, onboardingUuid, kycStatus, loading, } = useKycPopup();
    const popupFromUrl = searchParams.get("showKycPopup");
    const redirectedFrom = searchParams.get("redirectedFrom");

    const resolvedPopupType =
        popupType ??
        (popupFromUrl === "review"
            ? "review"
            : popupFromUrl === "required"
                ? "required"
                : onboardingStatus === null &&
                    kycStatus === null
                    ? "required"
                    : kycStatus === "pending"
                        ? "review"
                        : null);

    return (
        <>
            {redirectedFrom && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />

                    <AlertTitle>
                        KYC Required
                    </AlertTitle>

                    <AlertDescription>
                        Complete your KYC verification
                        to access:
                        <strong>
                            {" "}
                            {redirectedFrom}
                        </strong>
                    </AlertDescription>
                </Alert>
            )}

            {!loading && (
                <KYCPopup
                    onboardingId={
                        onboardingUuid ??
                        undefined
                    }
                    popupType={
                        resolvedPopupType
                    }
                />
            )}
        </>
    );
}