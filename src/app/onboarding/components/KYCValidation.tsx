// app/onboarding/components/KYCValidation.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// Import components
import { BillingCountrySelector } from "./BillingCountrySelector";
import { AccountVerification } from "./AccountVerification";
import { AccountTypeSelection } from "./AccountTypeSelection";
import { IndividualVerification } from "./IndividualVerification";
import {
    EnterpriseVerification,
    type BusinessType,
    type BillingAddressSource,
    type UploadedDocument,
} from "./EnterpriseVerification";
import { BillingAddress } from "./BillingAddress";
import { TermsAndConditions } from "./TermsAndConditions";
import { apiFetch } from "@/lib/apiFetch";
import { setAccessToken } from "@/lib/auth/tokenStore";
import { useKycPopup } from "@/lib/kyc/KycContext";

// ── API helpers ───────────────────────────────────────────────────────────────
import { initiateDigiLocker, checkDigiLockerStatus, type AddressData } from "../api/cashfree/digilocker";
import { verifyGST } from "../api/cashfree/gst";
import { verifyPAN } from "../api/cashfree/pan";
import { verifyCIN } from "../api/cashfree/cin";
import { initiateDidit, pollDiditStatus, deleteDiditSession, type DiditStatus } from "../api/didit";

type AccountType = "individual" | "enterprise" | null;

interface VerificationStatus {
    email: boolean;
    phone: boolean;
    gst: boolean;
    aadhar: boolean;
    cin: boolean;
    pan: boolean;
}

// AddressData is imported from api/cashfree/digilocker.ts

// Shape sent by the callback page via postMessage
interface DiditSuccessPayload {
    type: "DIDIT_SUCCESS";
    status: string;
    isApproved: boolean;
}

type KYCValidationProps = {
    onboardingId: string;
};

const KYCValidation = ({ onboardingId }: KYCValidationProps) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshKycStatus } = useKycPopup();

    const [selectedCountry, setSelectedCountry] = useState<string>("India");
    const [accountType, setAccountType] = useState<AccountType>(null);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [countryCode, setCountryCode] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [businessType, setBusinessType] = useState<BusinessType>(null);
    const [gstNumber, setGstNumber] = useState("");
    const [panNumber, setPanNumber] = useState("");
    const [cinNumber, setCinNumber] = useState("");
    const [StreetAddress, setStreetAddress] = useState("");
    // const [streetAddress2, setStreetAddress2] = useState("");
    const [state, setState] = useState("");
    const [city, setCity] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [diditSessionId, setDiditSessionId] = useState<string | null>(null);
    const [diditStatus, setDiditStatus] = useState<DiditStatus>("Not Started");
    const [diditFullName, setDiditFullName] = useState("");
    const [enterpriseRepName, setEnterpriseRepName] = useState("");
    const [isCancellingDidit, setIsCancellingDidit] = useState(false);

    // Separate address snapshots fetched from each verification source
    const [gstAddress, setGstAddress] = useState<AddressData | null>(null);
    const [aadharAddress, setAadharAddress] = useState<AddressData | null>(null);
    const [billingAddressSource, setBillingAddressSource] =
        useState<BillingAddressSource>("aadhar");

    // Non-Indian: uploaded business documents
    const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);

    const [verification, setVerification] = useState<VerificationStatus>({
        email: false,
        phone: false,
        gst: false,
        aadhar: false,
        cin: false,
        pan: false,
    });

    // ── Reset handlers ────────────────────────────────────────────────────────

    const handleResetPAN = () => {
        setPanNumber("");
        setVerification((prev) => ({ ...prev, pan: false }));
    };

    const handleResetCIN = () => {
        setCinNumber("");
        setVerification((prev) => ({ ...prev, cin: false }));
    };

    const handleResetGST = () => {
        setGstNumber("");
        setVerification((prev) => ({ ...prev, gst: false }));
    };

    const handleResetAadhar = async () => {
        try {
            const res = await apiFetch("/api/verify/digilocker/reset", { method: "POST" });
            if (!res.ok) {
                toast.error("Failed to reset Aadhaar verification. Please try again.");
                return;
            }
        } catch (e) {
            console.error("Aadhaar reset error:", e);
            toast.error("Something went wrong while resetting.");
            return;
        }
        // Clear local state after confirmed DB reset
        setAadharAddress(null);
        setVerification((prev) => ({ ...prev, aadhar: false }));
        setStreetAddress("");
        setState("");
        setCity("");
        setPostalCode("");
        toast.success("Aadhaar reset. You can now verify again.");
    };

    // ── Mount ─────────────────────────────────────────────────────────────────

    // ── Mount + restore localStorage values (avoids SSR hydration mismatch) ──
    useEffect(() => {
        setMounted(true);

        // Restore persisted values after hydration
        const savedAccountType = localStorage.getItem("kyc_accountType") as AccountType;
        if (savedAccountType) setAccountType(savedAccountType);

        const savedBillingSource = localStorage.getItem("billingAddressSource") as BillingAddressSource;
        if (savedBillingSource) setBillingAddressSource(savedBillingSource);
    }, []);

    // ── Persist accountType (only after mount to avoid clearing on SSR) ─────
    useEffect(() => {
        if (!mounted) return;
        if (accountType) {
            localStorage.setItem("kyc_accountType", accountType);
        } else {
            localStorage.removeItem("kyc_accountType");
        }
    }, [accountType, mounted]);

    // ── Restore The Token ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const restoreSession = async () => {
            const res = await fetch("/api/auth/refresh", {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) return;

            const data = await res.json();

            setAccessToken(data.accessToken);
        };
        restoreSession();
    }, []);

    // ── Fetch user / KYC data on mount ────────────────────────────────────────
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await apiFetch("/api/onboarding/client");
                if (!res.ok) { router.push("/login"); return; }

                const data = await res.json();

                setEmail(data.user.email);
                setPhone(data.user.phone);
                setCountryCode(data.user.countryCode);

                setVerification((prev) => ({
                    ...prev,
                    email: data.user.isEmailVerified,
                    phone: data.user.isPhoneVerified,
                    // Use verifications.aadhaar (computed from both kycProfile AND
                    // verificationDocument) to survive page reload before KYC submission
                    aadhar: Boolean(data.verifications?.aadhaar) || Boolean(data.kycProfile?.aadharVerified),
                    pan: Boolean(data.verifications?.pan) || Boolean(data.kycProfile?.panVerified),
                    cin: Boolean(data.verifications?.cin) || Boolean(data.kycProfile?.cinVerified),
                    gst: Boolean(data.verifications?.gst) || Boolean(data.kycProfile?.gstVerified),
                }));

                if (data.verificationData?.pan) {
                    setPanNumber(data.verificationData.pan.panNumber || "");
                }

                if (data.verificationData?.gst) {
                    setGstNumber(data.verificationData.gst.gstNumber || "");

                    if (!companyName) {
                        setCompanyName(
                            data.verificationData.gst.tradeName ||
                            data.verificationData.gst.legalName ||
                            ""
                        );
                    }

                    const s = data.verificationData.gst.splitAddress;
                    if (s) {
                        const fullStreet = [
                            s.flat_number,
                            s.building_number,
                            s.building_name,
                            s.street,
                            s.location,
                        ]
                            .filter(Boolean)
                            .join(", ");

                        const gstAddr: AddressData = {
                            streetAddress: fullStreet,
                            city: s.city || "",
                            state: s.state || "",
                            postalCode: s.pincode || "",
                        };

                        setGstAddress(gstAddr);
                    }
                }

                // Auto-fill address from KYC profile (Aadhaar-sourced)
                // if (data.kycProfile) {
                //     const addr: AddressData = {
                //         streetAddress: data.kycProfile.streetAddress || "",
                //         city: data.kycProfile.city || "",
                //         state: data.kycProfile.state || "",
                //         postalCode: data.kycProfile.postalCode || "",
                //     };
                //     if (addr.streetAddress) {
                //         setAadharAddress(addr);
                //     }
                // }
                const aadharAddrFromDb: AddressData | null = data.kycProfile
                    ? {
                        streetAddress: data.kycProfile.streetAddress || "",
                        city: data.kycProfile.city || "",
                        state: data.kycProfile.state || "",
                        postalCode: data.kycProfile.postalCode || "",
                    }
                    : null;

                if (aadharAddrFromDb) {
                    setAadharAddress(aadharAddrFromDb);
                }

                // Build GST address snapshot
                const gstSplit = data.verificationData?.gst?.splitAddress;
                const gstAddrFromDb: AddressData | null = gstSplit
                    ? {
                        streetAddress: [
                            gstSplit.flat_number,
                            gstSplit.building_number,
                            gstSplit.building_name,
                            gstSplit.street,
                            gstSplit.location,
                        ].filter(Boolean).join(", "),
                        city: gstSplit.city || "",
                        state: gstSplit.state || "",
                        postalCode: gstSplit.pincode || "",
                    }
                    : null;

                // Apply the right address based on saved preference
                const savedSource = (
                    typeof window !== "undefined"
                        ? (localStorage.getItem("billingAddressSource") as BillingAddressSource)
                        : null
                ) ?? "aadhar";

                const addrToApply =
                    savedSource === "gst"
                        ? (gstAddrFromDb || aadharAddrFromDb)
                        : (aadharAddrFromDb || gstAddrFromDb);

                if (addrToApply) applyAddress(addrToApply);
            } catch (err) {
                console.error("Fetch user error:", err);
                router.push("/login");
            }
        };

        fetchUser();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    // ── IP-based country detection ────────────────────────────────────────────
    // useEffect(() => {
    //     if (!mounted) return;

    //     const detectCountry = async () => {
    //         try {

    //             const res = await fetch("https://ipwho.is/");
    //             const data = await res.json();

    //             // ipwho.is uses "country"
    //             setSelectedCountry(data?.country || "India");

    //         } catch (error) {

    //             console.error("IP detection failed:", error);

    //             // fallback
    //             setSelectedCountry("India");

    //         }
    //     };

    //     detectCountry();
    // }, [mounted]);

    useEffect(() => {
        if (!mounted) return;

        const detectCountry = async () => {

            const savedCountry = localStorage.getItem("detected_country");

            if (savedCountry) {
                setSelectedCountry(savedCountry);
                return;
            }

            try {

                const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;

                const res = await fetch(
                    `https://api.ipinfo.io/lite/me?token=${token}`
                );

                if (!res.ok) {
                    throw new Error("Failed to fetch IP info");
                }

                const data = await res.json();

                const country = data?.country || "India";

                localStorage.setItem("detected_country", country);

                setSelectedCountry(country);

            } catch (error) {

                console.error("IP detection failed:", error);

                setSelectedCountry("India");

            }
        };

        detectCountry();

    }, [mounted]);

    // ── Handle returning from DigiLocker redirect ─────────────────────────────
    useEffect(() => {
        const verified = searchParams.get("verified");
        if (verified !== "true") return;

        const refreshData = async () => {
            try {
                const res = await apiFetch("/api/onboarding/client");
                if (!res.ok) return;

                const data = await res.json();
                setVerification((prev) => ({
                    ...prev,
                    aadhar: Boolean(data.verifications?.aadhaar) || Boolean(data.kycProfile?.aadharVerified),
                }));

                if (data.kycProfile) {
                    const addr: AddressData = {
                        streetAddress: data.kycProfile.streetAddress || "",
                        city: data.kycProfile.city || "",
                        state: data.kycProfile.state || "",
                        postalCode: data.kycProfile.postalCode || "",
                    };
                    setAadharAddress(addr);
                    if (billingAddressSource === "aadhar") applyAddress(addr);
                }
            } catch (err) {
                console.error("Refresh data error:", err);
            }
        };

        refreshData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    // ── Address helpers ───────────────────────────────────────────────────────
    const applyAddress = (addr: AddressData) => {
        setStreetAddress(addr.streetAddress);
        setState(addr.state);
        setCity(addr.city);
        setPostalCode(addr.postalCode);
    };

    const handleBillingAddressSourceChange = (source: BillingAddressSource) => {
        setBillingAddressSource(source);
        localStorage.setItem("billingAddressSource", source);
        const addr = source === "gst" ? gstAddress : aadharAddress;
        if (addr) applyAddress(addr);
    };

    // ── Derived values ────────────────────────────────────────────────────────
    const billingCurrency = useMemo(
        () => (selectedCountry === "India" ? "INR" : "USD"),
        [selectedCountry]
    );

    const isIndian = selectedCountry === "India";

    // ── Didit verification (non-Indian) ──────────────────────────────────────
    const handleDiditVerify = async () => {
        const nameToVerify = accountType === "enterprise" ? enterpriseRepName : diditFullName;
        const params = new URLSearchParams(window.location.search);
        const currentOnboardingId = params.get("id");

        const result = await initiateDidit(currentOnboardingId, nameToVerify);

        if (result.sessionId) {
            setDiditSessionId(result.sessionId);
            setDiditStatus("Pending");
        }
    };

    // ── Cancel / reset a pending Didit session ───────────────────────────
    // Called when the user clicks "Cancel & Start Over" in the pending alert.
    // This deletes the Didit session so a fresh one can be created on retry.
    const handleCancelDidit = async () => {
        const sessionToDelete = diditSessionId || localStorage.getItem("diditSessionId");

        setIsCancellingDidit(true);
        try {
            if (sessionToDelete) {
                await deleteDiditSession(sessionToDelete);
            }
        } finally {
            // Always reset local state regardless of API success
            localStorage.removeItem("diditSessionId");
            localStorage.removeItem("diditStatus");
            setDiditSessionId(null);
            setDiditStatus("Not Started");
            setIsCancellingDidit(false);
        }
    };

    // ── Restore Didit session from localStorage on mount ─────────────────────────
    useEffect(() => {
        if (!mounted) return;

        const savedSessionId = localStorage.getItem("diditSessionId");
        const savedStatus = localStorage.getItem("diditStatus") as any;

        if (savedSessionId) {
            setDiditSessionId(savedSessionId);
            // Restore Pending state so alert shows on refresh too
            setDiditStatus(savedStatus ?? "Pending");
        } else if (savedStatus === "Approved" || savedStatus === "In Review") {
            setDiditStatus(savedStatus);
        }
    }, [mounted]);

    // ── DigiLocker verification (Indian) ─────────────────────────────────────
    const handleDigiLockerVerify = async () => {
        if (verification.aadhar) {
            toast.info("Already verified. Click 'Re-verify with different Aadhaar' to change.");
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const currentOnboardingId = params.get("id");
        await initiateDigiLocker(currentOnboardingId);
    };

    // ── DigiLocker popup success listener ────────────────────────────────────
    useEffect(() => {
        const handler = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== "DIGILOCKER_SUCCESS") return;

            const verificationId = event.data.verificationId;
            const loadingToast = toast.loading("Fetching your Aadhaar details...");

            let attempts = 0;
            const interval = setInterval(async () => {
                const result = await checkDigiLockerStatus(verificationId);
                console.log("Polling result:", result);

                if (result.verified) {
                    clearInterval(interval);
                    setVerification((v) => ({ ...v, aadhar: true }));

                    if (result.address) {
                        setAadharAddress(result.address);
                        setBillingAddressSource((prev) => {
                            if (prev === "aadhar") applyAddress(result.address!);
                            return prev;
                        });
                    }

                    toast.dismiss(loadingToast);
                    toast.success("Aadhaar verified! Address auto-filled.");
                } else if (attempts > 10) {
                    clearInterval(interval);
                    toast.dismiss(loadingToast);
                    toast.error("Verification timeout. Please try again.");
                }

                attempts++;
            }, 2000);
        };

        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Didit popup success listener (postMessage) ────────────────────────────
    useEffect(() => {
        const handler = (event: MessageEvent<DiditSuccessPayload>) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== "DIDIT_SUCCESS") return;

            const { isApproved, status } = event.data;

            if (isApproved) {
                setDiditStatus(status as any);
                localStorage.setItem("diditStatus", status);
                localStorage.removeItem("diditSessionId");

                if (status === "Approved") {
                    toast.success("Identity fully approved!");
                } else {
                    toast.success("Identity submitted and under review.");
                }
            } else {
                setDiditStatus(status as any);
                localStorage.setItem("diditStatus", status);

                if (status === "Declined") {
                    localStorage.removeItem("diditSessionId");
                    toast.error("Verification declined. Please try again.");
                } else if (status === "Pending") {
                    toast.info("Verification is pending. Please wait.");
                }
            }
        };

        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, []);

    // ── Didit Fallback polling ────────────────────
    useEffect(() => {
        if (!diditSessionId) return;

        // If already in a terminal state, don't poll
        if (diditStatus === "Approved" || diditStatus === "In Review" || diditStatus === "Declined") return;

        console.log("[Didit poll] starting polling for sessionId:", diditSessionId);

        const interval = setInterval(async () => {
            const result = await pollDiditStatus(diditSessionId);
            if (!result) return;

            console.log("[Didit poll] status data:", result.status);

            if (result.status === "Approved" || result.status === "In Review") {
                setDiditStatus(result.status);
                localStorage.setItem("diditStatus", result.status);
                localStorage.removeItem("diditSessionId");
                clearInterval(interval);
                toast.success(
                    result.status === "Approved"
                        ? "Identity Approved!"
                        : "Identity Under Review"
                );
            }

            if (result.status === "Declined") {
                setDiditStatus("Declined");
                localStorage.setItem("diditStatus", "Declined");
                localStorage.removeItem("diditSessionId");
                clearInterval(interval);
                toast.error("Identity verification declined.");
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [diditSessionId]);

    // ── Document upload handlers ──────────────────────────────────────────────
    const handleDocumentUpload = (doc: UploadedDocument) => {
        setUploadedDocuments((prev) => [...prev, doc]);
    };

    const handleDocumentRemove = (index: number) => {
        setUploadedDocuments((prev) => prev.filter((_, i) => i !== index));
    };

    // ── GST verification ──────────────────────────────────────────────────────
    const handleVerifyGST = async () => {
        const result = await verifyGST(gstNumber);
        if (!result.success) return;

        setVerification((prev) => ({ ...prev, gst: true }));

        if (result.gstAddress) {
            setGstAddress(result.gstAddress);
            setBillingAddressSource((prev) => {
                if (prev === "gst") applyAddress(result.gstAddress!);
                return prev;
            });
        }

        if (result.companyName && !companyName) {
            setCompanyName(result.companyName);
        }
    };

    // ── PAN verification ──────────────────────────────────────────────────────
    const handleVerifyPAN = async () => {
        const result = await verifyPAN(panNumber);
        if (result.success) {
            setVerification((prev) => ({ ...prev, pan: true }));
        }
    };

    // ── CIN verification ──────────────────────────────────────────────────────
    const handleVerifyCIN = async () => {
        const result = await verifyCIN(cinNumber);
        if (result.success) {
            setVerification((prev) => ({ ...prev, cin: true }));
        }
    };

    // ── Form submission ───────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (
            !selectedCountry ||
            !accountType ||
            !StreetAddress ||
            !state ||
            !city ||
            !postalCode
        ) {
            toast.error("Please fill all required fields");
            return;
        }

        if (!termsAccepted || !privacyAccepted) {
            toast.error("Please accept Terms & Conditions and Privacy Policy");
            return;
        }

        if (isIndian && !verification.aadhar) {
            toast.error("Please verify your identity with DigiLocker (Aadhaar)");
            return;
        }

        if (!isIndian && !(diditStatus === "Approved" || diditStatus === "In Review")) {
            toast.error("Please verify your identity with Didit before submitting");
            return;
        }

        if (!isIndian && accountType === "enterprise" && uploadedDocuments.length === 0) {
            toast.error("Please upload at least one business document");
            return;
        }

        if (accountType === "enterprise" && !isIndian) {
            if (!companyName?.trim()) {
                toast.error("Company Name is required");
                return;
            }
        }

        if (accountType === "enterprise" && isIndian) {
            if (!companyName?.trim()) {
                toast.error("Company Name is required");
                return;
            }

            if (!businessType) {
                toast.error("Please select a business type");
                return;
            }

            const isPANType =
                businessType === "sole_proprietorship" ||
                businessType === "partnership";

            if (isPANType && !verification.pan) {
                toast.error("Please verify your PAN card");
                return;
            }

            if (!isPANType && !verification.gst) {
                toast.error("Please verify your GST number");
                return;
            }

            if (isPANType && gstNumber && !verification.gst) {
                toast.error("Please verify GST or remove it.");
                return;
            }
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();

            // Attach all KYC fields as JSON
            formData.append("data", JSON.stringify({
                accountType,
                country: selectedCountry,
                state: state || "",
                city: city || "",
                postalCode: postalCode || "",
                streetAddress: StreetAddress || "",
                companyName: companyName || "",
                businessType: businessType || "",
                gstNumber: gstNumber || "",
                gstVerified: !!verification.gst,
                cinVerified: !!verification.cin,
                panVerified: !!verification.pan,
                aadharVerified: !!verification.aadhar,
                addressType: billingAddressSource === "gst" ? 1 : 0,
                billingCurrency: selectedCountry === "India" ? "INR" : "USD",
                internationalVerified:
                    diditStatus === "Approved" || diditStatus === "In Review" ? 1 : 0,
                representativeName:
                    accountType === "enterprise"
                        ? (enterpriseRepName || "").trim()
                        : (diditFullName || "").trim(),
            }));

            // Attach uploaded business documents
            if (!isIndian && accountType === "enterprise") {
                for (const doc of uploadedDocuments) {
                    formData.append("documents", doc.file);
                    // formData.append("documentTypes", doc.documentType || "other");
                    // formData.append("documentLabels", doc.label);
                }
            }

            const res = await apiFetch("/api/onboarding/submit", {
                method: "POST",
                // Don't set Content-Type — browser sets it with boundary for FormData
                body: formData,
            });

            const data = await res.json();



            if (!res.ok) {
                toast.error(data.error || "Failed to submit KYC");
                return;
            }

            // Clear localStorage after successful submit
            localStorage.removeItem("billingAddressSource");
            localStorage.removeItem("diditSessionId");
            localStorage.removeItem("diditStatus");
            localStorage.removeItem("kyc_accountType");

            await refreshKycStatus();

            toast.success("KYC submitted successfully!");
            router.push("/dashboard?showKycPopup=review");
        } catch (err) {
            toast.error("Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Derived: read-only address ────────────────────────────────────────────
    const isAddressReadOnly =
        isIndian &&
        (
            verification.aadhar ||
            verification.gst
        );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/dashboard")}
                        className="h-8 w-8"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-xl font-semibold text-foreground">
                        Customer Details
                    </h1>
                </div>

                <Card className="border-border">
                    <div className="hidden">{onboardingId}</div>
                    <CardContent className="p-6 space-y-6">
                        {/* Billing Country & Currency */}
                        <BillingCountrySelector
                            selectedCountry={selectedCountry}
                            onCountryChange={setSelectedCountry}
                            billingCurrency={billingCurrency}
                        />

                        {/* Account Verification */}
                        <AccountVerification
                            email={email}
                            phone={phone}
                            countryCode={countryCode}
                            verification={{
                                email: verification.email,
                                phone: verification.phone,
                            }}
                        />

                        {/* Account Type Selection */}
                        <AccountTypeSelection
                            accountType={accountType}
                            onAccountTypeChange={setAccountType}
                        />

                        {/* Individual Verification */}
                        {accountType === "individual" && (
                            <>
                                <IndividualVerification
                                    isVerified={
                                        isIndian
                                            ? verification.aadhar
                                            : diditStatus === "Approved" || diditStatus === "In Review"
                                    }
                                    diditStatus={diditStatus}
                                    onVerify={isIndian ? handleDigiLockerVerify : handleDiditVerify}
                                    onCancelDidit={handleCancelDidit}
                                    isCancellingDidit={isCancellingDidit}
                                    isIndian={isIndian}
                                    fullName={diditFullName}
                                    onFullNameChange={setDiditFullName}
                                    onResetVerification={handleResetAadhar}
                                />
                            </>
                        )}

                        {/* Enterprise Verification */}
                        {accountType === "enterprise" && (
                            <EnterpriseVerification
                                companyName={companyName}
                                businessType={businessType}
                                gstNumber={gstNumber}
                                panNumber={panNumber}
                                cinNumber={cinNumber}
                                verification={{
                                    gst: verification.gst,
                                    aadhar: verification.aadhar,
                                    cin: verification.cin,
                                    pan: verification.pan,
                                }}
                                isIndian={isIndian}
                                gstAddress={gstAddress}
                                aadharAddress={aadharAddress}
                                billingAddressSource={billingAddressSource}
                                onCompanyNameChange={setCompanyName}
                                onBusinessTypeChange={setBusinessType}
                                onGstNumberChange={setGstNumber}
                                onPanNumberChange={setPanNumber}
                                onCinNumberChange={setCinNumber}
                                onVerifyGST={handleVerifyGST}
                                onVerifyAadhar={handleDigiLockerVerify}
                                onVerifyDidit={handleDiditVerify}
                                onCancelDidit={handleCancelDidit}
                                isCancellingDidit={isCancellingDidit}
                                onVerifyCIN={handleVerifyCIN}
                                onVerifyPAN={handleVerifyPAN}
                                onBillingAddressSourceChange={
                                    handleBillingAddressSourceChange
                                }
                                onResetPAN={handleResetPAN}
                                onResetCIN={handleResetCIN}
                                onResetGST={handleResetGST}
                                onResetAadhar={handleResetAadhar}
                                uploadedDocuments={uploadedDocuments}
                                onDocumentUpload={handleDocumentUpload}
                                onDocumentRemove={handleDocumentRemove}
                                representativeName={enterpriseRepName}
                                onRepresentativeNameChange={setEnterpriseRepName}
                                diditStatus={diditStatus}
                            />
                        )}

                        {/* Billing Address */}
                        {accountType && (
                            <BillingAddress
                                streetAddress={StreetAddress}
                                state={state}
                                city={city}
                                postalCode={postalCode}
                                readOnly={isAddressReadOnly}
                                isIndian={isIndian}
                                onStreetAddressChange={setStreetAddress}
                                onStateChange={setState}
                                onCityChange={setCity}
                                onPostalCodeChange={setPostalCode}
                            />
                        )}

                        {/* Terms & Conditions */}
                        <TermsAndConditions
                            termsAccepted={termsAccepted}
                            privacyAccepted={privacyAccepted}
                            onTermsChange={setTermsAccepted}
                            onPrivacyChange={setPrivacyAccepted}
                        />

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/dashboard")}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default KYCValidation;