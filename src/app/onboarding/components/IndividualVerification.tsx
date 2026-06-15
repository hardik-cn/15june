// app/onboarding/components/IndividualVerification.tsx
"use client";

import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { CheckCircle2, Shield, Info, ExternalLink, Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

type DiditStatus = "Not Started" | "Pending" | "In Review" | "Approved" | "Declined";

interface IndividualVerificationProps {
    isVerified: boolean;
    onVerify: () => void;
    isIndian?: boolean;
    /** Only relevant for non-Indian (Didit) flow */
    diditStatus?: DiditStatus;
    fullName?: string;
    onFullNameChange?: (val: string) => void;
    /** Called when user explicitly cancels a pending Didit session */
    onCancelDidit?: () => void;
    /** True while the cancel/delete API call is in flight */
    isCancellingDidit?: boolean;
    /** Optional callback to reset Aadhaar verification (returns true if reset) */
    onResetVerification?: () => void | Promise<void>;
}

export const IndividualVerification = ({
    isVerified,
    onVerify,
    isIndian = true,
    diditStatus = "Not Started",
    fullName,
    onFullNameChange,
    onCancelDidit,
    isCancellingDidit = false,
    onResetVerification,
}: IndividualVerificationProps) => {
    // ── Indian — DigiLocker ───────────────────────────────────────────────────
    if (isIndian) {
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                            Identity Verification
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Verify your identity securely using DigiLocker. Your Aadhaar
                            details will be used to auto-fill your address.
                        </p>

                        {!isVerified && (
                            <Alert className="mb-4">
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    You'll be redirected to DigiLocker to complete
                                    verification. Make sure you have your Aadhaar number
                                    and registered mobile number ready.
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                onClick={onVerify}
                                className="w-full md:w-auto"
                                disabled={isVerified}
                                size="lg"
                            >
                                {isVerified ? (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Aadhaar Verified
                                    </>
                                ) : (
                                    <>
                                        <Shield className="h-4 w-4 mr-2" />
                                        Verify with DigiLocker
                                    </>
                                )}
                            </Button>

                            {/* Allow re-verification with a different Aadhaar */}
                            {isVerified && onResetVerification && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onResetVerification}
                                    className="text-xs text-destructive hover:text-destructive"
                                >
                                    Re-verify with different Aadhaar
                                </Button>
                            )}
                        </div>

                        {isVerified && (
                            <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Your identity has been verified successfully
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Derived booleans from diditStatus
    const isPending = diditStatus === "Pending";
    const isInReview = diditStatus === "In Review";
    const isApproved = diditStatus === "Approved";
    const isDeclined = diditStatus === "Declined";
    // Button is disabled once verified (Approved or In Review) OR while pending
    const buttonDisabled = isVerified || isPending;

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">
                        Identity Verification
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Verify your identity securely using Didit — a trusted global
                        identity verification platform.
                    </p>

                    {/* Pre-verification info alert */}
                    {diditStatus === "Not Started" && (
                        <Alert className="mb-4">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                                You'll be redirected to Didit to complete identity
                                verification. Please have a valid government-issued ID
                                (passport, national ID, or driver's licence) ready.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Pending alert */}
                    {isPending && (
                        <Alert className="mb-4 border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                            {/* <Clock className="h-4 w-4 text-yellow-600" /> */}
                            <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-400">
                                <div className="flex items-center justify-between gap-3">
                                    <span>Please complete the verification in the popup window, or cancel to try again</span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={onCancelDidit}
                                        disabled={isCancellingDidit}
                                        className="shrink-0 border-yellow-400 text-yellow-800 hover:bg-yellow-100 dark:text-yellow-300 dark:border-yellow-600 dark:hover:bg-yellow-900/30"
                                    >
                                        {isCancellingDidit ? "Cancelling…" : "Cancel & Start Over"}
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Declined alert */}
                    {isDeclined && (
                        <Alert className="mb-4 border-red-300 bg-red-50 dark:bg-red-950/20">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <AlertDescription className="text-sm text-red-800 dark:text-red-400">
                                Your verification was declined. Please try again with a
                                valid, clear government-issued ID.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Full name input — only shown before verification starts or after decline */}
                    {(diditStatus === "Not Started" || isDeclined) && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1">
                                Full Name (as per your ID document) <span className="text-destructive">*</span>
                            </label>
                            <Input
                                type="text"
                                value={fullName || ""}
                                onChange={(e) => onFullNameChange?.(e.target.value)}
                                placeholder="Enter full legal name"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Please enter your full name exactly as shown on your document.</p>
                        </div>
                    )}

                    {/* Verify button */}
                    <Button
                        onClick={onVerify}
                        className="w-full md:w-auto gap-2"
                        disabled={buttonDisabled}
                        size="lg"
                        variant={isVerified ? "outline" : "default"}
                    >
                        {isVerified ? (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                {isApproved ? "Identity Approved" : "Identity Under Review"}
                            </>
                        ) : isPending ? (
                            <>
                                <Clock className="h-4 w-4 animate-spin" />
                                Verification Pending…
                            </>
                        ) : (
                            <>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 fill-current"
                                    aria-hidden="true"
                                >
                                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
                                </svg>
                                {isDeclined ? "Retry with Didit" : "Verify with Didit"}
                                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                            </>
                        )}
                    </Button>

                    {/* Status messages below the button */}
                    {isApproved && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Your identity has been verified successfully via Didit
                        </p>
                    )}
                    {isInReview && (
                        <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Your identity is under review - you can proceed and we'll
                            notify you once complete
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};