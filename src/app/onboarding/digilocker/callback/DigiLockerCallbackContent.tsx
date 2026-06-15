// app/onboarding/digilocker/callback/DigiLockerCallbackContent.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function DigiLockerCallbackInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

    useEffect(() => {
        const verificationId = searchParams.get("verification_id");
        const onboardingId = searchParams.get("onboarding_id");

        if (!verificationId) {
            setStatus("error");
            return;
        }

        // Check if we're in a popup window
        if (window.opener && !window.opener.closed) {
            try {
                // Send message to parent window
                window.opener.postMessage(
                    {
                        type: "DIGILOCKER_SUCCESS",
                        verificationId,
                    },
                    window.location.origin
                );

                setStatus("success");

                // Close popup after a short delay
                setTimeout(() => {
                    window.close();
                }, 1000);
            } catch (error) {
                console.error("Error sending message to parent:", error);
                setStatus("error");
            }
        } else {
            // Not in a popup - redirect to onboarding page
            if (onboardingId) {
                router.push(`/onboarding?id=${onboardingId}&verified=true`);
            } else {
                router.push("/dashboard");
            }
        }
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center p-8">
                {status === "processing" && (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-lg">Processing verification...</p>
                    </>
                )}
                {status === "success" && (
                    <>
                        <div className="text-green-500 text-5xl mb-4">✓</div>
                        <p className="text-lg">Verification successful! Closing window...</p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <div className="text-red-500 text-5xl mb-4">✗</div>
                        <p className="text-lg">Verification failed. Please try again.</p>
                    </>
                )}
            </div>
        </div>
    );
}