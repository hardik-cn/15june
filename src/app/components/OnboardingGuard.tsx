// src/app/components/OnboardingGuard.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/auth/AuthProvider";

interface OnboardingGuardProps {
    children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isLoading } = useAuth();
    const [isChecking, setIsChecking] = useState(true);
    const [isAllowed, setIsAllowed] = useState(false);

    useEffect(() => {

        if (isLoading) return;

        const checkOnboardingStatus = async () => {

            try {

                if (pathname === "/dashboard" || pathname.startsWith("/onboarding")) {
                    setIsAllowed(true);
                    setIsChecking(false);
                    return;
                }

                const response = await apiFetch("/api/user/onboarding-status");

                if (response.ok) {

                    const data = await response.json();

                    const onboardingStatus = data.onboardingStatus;
                    const kycStatus = data.kycStatus;

                    if (kycStatus) {

                        const normalizedStatus =
                            kycStatus.toLowerCase().trim();

                        if (normalizedStatus === "pending") {
                            setIsAllowed(true);
                            return;
                        }

                        if (normalizedStatus === "approved") {
                            setIsAllowed(true);
                            return;
                        }

                        router.replace("/dashboard?showKycPopup=required");
                        return;

                    }

                    if (!onboardingStatus || onboardingStatus !== "completed") {
                        router.replace("/dashboard?showKycPopup=required");
                        return;
                    }

                    setIsAllowed(true);

                }

            } catch (error) {
                // If it's an auth error or other failure, we don't set isAllowed(true)
                // apiFetch will handle redirection if it's a 401 refresh failure
                console.error("Onboarding guard check failed", error);
            } finally {
                setIsChecking(false);
            }

        };

        checkOnboardingStatus();

    }, [pathname, isLoading]);

    // Show loading state while checking
    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Only render children if allowed
    return isAllowed ? <>{children}</> : null;
}
