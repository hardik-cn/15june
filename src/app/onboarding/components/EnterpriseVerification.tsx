// src/app/onboarding/components/EnterpriseVerification.tsx
"use client";
import { useRef, useState } from "react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import {
    CheckCircle2,
    AlertCircle,
    Building2,
    CreditCard,
    ExternalLink,
    Upload,
    X,
    FileText,
    Shield,
} from "lucide-react";
import { Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { toast } from "sonner";
import { businessTypeOptions } from "@/lib/business-types";

export type BusinessType =
    | "sole_proprietorship"
    | "private_limited"
    | "public_limited"
    | "llp"
    | "opc"
    | "partnership"
    | null;

export type BillingAddressSource = "gst" | "aadhar";

interface VerificationStatus {
    gst: boolean;
    aadhar: boolean;
    cin: boolean;
    pan: boolean;
}

interface AddressData {
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
}

export interface UploadedDocument {
    file: File;
    // label: string;
    // documentType: string;
}

interface EnterpriseVerificationProps {
    companyName: string;
    businessType: BusinessType;
    gstNumber: string;
    panNumber: string;
    cinNumber: string;
    verification: VerificationStatus;
    isIndian: boolean;
    gstAddress: AddressData | null;
    aadharAddress: AddressData | null;
    billingAddressSource: BillingAddressSource;
    // Non-Indian
    uploadedDocuments?: UploadedDocument[];
    representativeName?: string;
    diditStatus?: "Not Started" | "Pending" | "In Review" | "Approved" | "Declined";
    onRepresentativeNameChange?: (val: string) => void;
    onCompanyNameChange: (value: string) => void;
    onBusinessTypeChange: (value: BusinessType) => void;
    onGstNumberChange: (value: string) => void;
    onPanNumberChange: (value: string) => void;
    onCinNumberChange: (value: string) => void;
    onVerifyGST: () => void;
    onVerifyAadhar: () => void;
    onVerifyDidit?: () => void;
    /** Called when user explicitly cancels a pending Didit session */
    onCancelDidit?: () => void;
    /** True while the cancel/delete API call is in flight */
    isCancellingDidit?: boolean;
    onVerifyCIN: () => void;
    onVerifyPAN: () => void;
    onBillingAddressSourceChange: (source: BillingAddressSource) => void;
    onResetPAN: () => void;
    onResetCIN: () => void;
    onResetGST: () => void;
    onResetAadhar: () => void;
    onDocumentUpload?: (doc: UploadedDocument) => void;
    onDocumentRemove?: (index: number) => void;
}

// const businessTypeOptions = [
//     { value: "sole_proprietorship", label: "Sole Proprietorship" },
//     { value: "private_limited", label: "Private Limited Company (Pvt. Ltd)" },
//     { value: "public_limited", label: "Public Limited Company (Ltd)" },
//     { value: "llp", label: "Limited Liability Partnership (LLP)" },
//     { value: "opc", label: "One Person Private Limited Company (OPC Pvt Ltd)" },
//     { value: "partnership", label: "Partnership Firm" },
// ];


// const DOCUMENT_TYPES = [
//     { value: "certificate_of_incorporation", label: "Certificate of Incorporation" },
//     { value: "business_registration", label: "Business Registration Certificate" },
//     { value: "memorandum_of_association", label: "Memorandum of Association (or equivalent constitutional document)" },
//     { value: "articles_of_association", label: "Articles of Association / Company Bylaws" },
//     { value: "ownership_proof", label: "Proof of Ownership / Authorization Letter" },
//     { value: "other", label: "Other Business Document" },
// ];

export const EnterpriseVerification = ({
    companyName,
    businessType,
    gstNumber,
    panNumber,
    cinNumber,
    verification,
    isIndian,
    gstAddress,
    aadharAddress,
    billingAddressSource,
    uploadedDocuments = [],
    representativeName,
    onRepresentativeNameChange,
    diditStatus,
    onCompanyNameChange,
    onBusinessTypeChange,
    onGstNumberChange,
    onPanNumberChange,
    onCinNumberChange,
    onVerifyGST,
    onVerifyAadhar,
    onVerifyDidit,
    onCancelDidit,
    isCancellingDidit = false,
    onVerifyCIN,
    onVerifyPAN,
    onBillingAddressSourceChange,
    onResetPAN,
    onResetCIN,
    onResetGST,
    onResetAadhar,
    onDocumentUpload,
    onDocumentRemove,
}: EnterpriseVerificationProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    // const selectedDocTypeRef = useRef<string>("certificate_of_incorporation");
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
        const maxSize = 10 * 1024 * 1024;

        for (const file of files) {

            const ext = file.name.split(".").pop()?.toLowerCase();

            if (!ext || !allowedExtensions.includes(ext)) {
                toast.error("Only PDF, JPG, JPEG, and PNG files are allowed.");
                continue;
            }

            if (file.size > maxSize) {
                toast.error(`${file.name} exceeds the 10MB limit.`);
                continue;
            }

            const label =
                // DOCUMENT_TYPES.find(
                //     d => d.value === selectedDocTypeRef.current
                // )?.label ?? "Document";

                onDocumentUpload?.({
                    file,
                    // label,
                    // documentType: selectedDocTypeRef.current
                });
        }
    };

    const requiresCIN = businessType && [
        "private_limited",
        "public_limited",
        "llp",
        "opc",
    ].includes(businessType);

    // Sole Proprietorship & Partnership → PAN required; rest → GST required
    const requiresPAN = businessType && [
        "sole_proprietorship",
        "partnership",
    ].includes(businessType);

    const isSoleOrPartnership =
        businessType === "sole_proprietorship" ||
        businessType === "partnership";

    const requiresGST = businessType && !isSoleOrPartnership;

    // Show billing address source picker when both GST and Aadhaar are verified
    const showAddressSourcePicker = isIndian && verification.aadhar && (
        requiresPAN ? true : verification.gst
    );

    const selectedAddress = billingAddressSource === "gst" ? gstAddress : aadharAddress;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];
        if (!file) return;

        const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
        const allowedMimeTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        const maxSize = 10 * 1024 * 1024;

        const ext = file.name.split(".").pop()?.toLowerCase();

        if (!ext || !allowedExtensions.includes(ext)) {
            toast.error("Only PDF, JPG, JPEG, and PNG files are allowed.");
            e.target.value = "";
            return;
        }

        if (!allowedMimeTypes.includes(file.type)) {
            toast.error("Invalid file type.");
            e.target.value = "";
            return;
        }

        if (file.size > maxSize) {
            toast.error("File must be smaller than 10MB.");
            e.target.value = "";
            return;
        }

        // const label =
        //     DOCUMENT_TYPES.find(
        //         d => d.value === selectedDocTypeRef.current
        //     )?.label ?? "Document";

        onDocumentUpload?.({
            file,
            // label,
            // documentType: selectedDocTypeRef.current
        });

        // reset input so same file can be re-uploaded
        e.target.value = "";
    };

    return (
        <div className="space-y-4 pt-2">
            {/* Company Name and Business Type */}
            <div className={isIndian ? "grid md:grid-cols-2 gap-4" : ""}>
                <div className="space-y-2">
                    <Label>
                        Company Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        value={companyName}
                        onChange={(e) => onCompanyNameChange(e.target.value)}
                        placeholder="Enter company name"
                    />
                </div>

                {/* Business Type — only shown for Indian enterprise accounts */}
                {isIndian && (
                    <div className="space-y-2">
                        <Label>
                            Business Type <span className="text-destructive">*</span>
                        </Label>
                        <Select value={businessType || ""} onValueChange={(value) => onBusinessTypeChange(value as BusinessType)}>
                            <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                            <SelectContent className="max-h-64">
                                {businessTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* ──────────────────────────────────────────────
                INDIA: existing GST / PAN / CIN / Aadhaar flow
            ────────────────────────────────────────────── */}
            {isIndian && businessType && (
                <>
                    {/* CIN Verification - Only for Pvt Ltd, Ltd, LLP, OPC */}
                    {requiresCIN && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                CIN Number <span className="text-destructive">*</span> <span className="p-2 bg-slate-600 cursor-text">U72900KA2015PTC082989</span>
                                {verification.cin && (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={onResetCIN}
                                            className="text-xs text-destructive"
                                        >
                                            Reset
                                        </Button>
                                    </>
                                )}
                            </Label>
                            <div className="relative">
                                <Input
                                    value={cinNumber}
                                    onChange={(e) => onCinNumberChange(e.target.value)}
                                    placeholder="Enter CIN Number (21 characters)"
                                    className="pr-24"
                                    disabled={verification.cin}
                                />
                                {!verification.cin && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                                        onClick={onVerifyCIN}
                                        disabled={!cinNumber}
                                    >
                                        Verify CIN
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* PAN Card Verification - Required for Sole Proprietorship and Partnership */}
                    {requiresPAN && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                PAN Card Number <span className="text-destructive">*</span> <span className="p-2 bg-slate-600 cursor-text">ABCPV1234D</span>
                                {verification.pan && (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={onResetPAN}
                                            className="text-xs text-destructive"
                                        >
                                            Reset
                                        </Button>
                                    </>
                                )}
                            </Label>
                            <div className="relative">
                                <Input
                                    value={panNumber}
                                    onChange={(e) => onPanNumberChange(e.target.value.toUpperCase())}
                                    placeholder="Enter PAN Number (e.g. ABCDE1234F)"
                                    className="pr-24"
                                    maxLength={10}
                                    disabled={verification.pan}
                                />
                                {!verification.pan && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                                        onClick={onVerifyPAN}
                                        disabled={!panNumber || panNumber.length < 10}
                                    >
                                        Verify PAN
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                PAN Card verification is mandatory for Sole Proprietorship &amp; Partnership firms
                            </p>
                        </div>
                    )}

                    {/* GST Number - Required for all except Sole Proprietorship & Partnership */}
                    {businessType && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                GST Number{" "}
                                {requiresGST ? (
                                    <span className="text-destructive">*</span>
                                ) : (
                                    <span className="text-xs text-muted-foreground">(optional)</span>
                                )}
                                <span className="p-2 bg-slate-600 cursor-text">
                                    29AAICP2912R1ZR
                                </span>
                                {verification.gst && (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={onResetGST}
                                            className="text-xs text-destructive"
                                        >
                                            Reset
                                        </Button>
                                    </>
                                )}
                            </Label>
                            <div className="relative">
                                <Input
                                    value={gstNumber}
                                    onChange={(e) => onGstNumberChange(e.target.value.toUpperCase())}
                                    placeholder="Enter GST Number (e.g. 22AAAAA0000A1Z5)"
                                    className="pr-24"
                                    disabled={verification.gst}
                                />
                                {!verification.gst && gstNumber && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                                        onClick={onVerifyGST}
                                        disabled={!gstNumber}
                                    >
                                        Verify GST
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {requiresGST
                                    ? "GST verification is mandatory for this business type"
                                    : "GST is optional for this business type. If provided, it must be verified."}
                            </p>
                        </div>
                    )}

                    {/* Aadhaar Verification */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            Aadhaar Verification <span className="text-destructive">*</span>
                            {verification.aadhar && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </Label>
                        <div className="relative">
                            <Button
                                type="button"
                                variant={verification.aadhar ? "outline" : "secondary"}
                                className="w-full"
                                onClick={
                                    verification.aadhar
                                        ? onResetAadhar
                                        : onVerifyAadhar
                                }
                            >
                                {verification.aadhar
                                    ? "Reset Aadhaar Verification"
                                    : "Verify Aadhaar via DigiLocker"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Aadhaar verification is required for all enterprise accounts
                        </p>
                    </div>

                    {/* Billing Address Source Picker */}
                    {showAddressSourcePicker && (
                        <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                Choose Billing Address Source
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Select which verified address to use as your billing address.
                            </p>
                            <RadioGroup
                                value={billingAddressSource}
                                onValueChange={(v) => onBillingAddressSourceChange(v as BillingAddressSource)}
                                className=""
                            >
                                {/* GST-based address */}
                                {verification.gst && gstAddress && (
                                    <div className={`flex items-start space-x-3 p-3 rounded-md border transition-colors cursor-pointer ${billingAddressSource === "gst" ? "border-primary bg-primary/5" : "border-border"}`}>
                                        <RadioGroupItem value="gst" id="addr-gst" className="mt-0.5" />
                                        <label htmlFor="addr-gst" className="cursor-pointer flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-sm font-medium">GST Registered Address</span>
                                                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">Verified</span>
                                            </div>
                                        </label>
                                    </div>
                                )}

                                {/* Aadhaar-based address */}
                                {verification.aadhar && aadharAddress && (
                                    <div className={`flex items-start space-x-3 mt-0  p-3 rounded-md border transition-colors cursor-pointer ${billingAddressSource === "aadhar" ? "border-primary bg-primary/5" : "border-border"}`}>
                                        <RadioGroupItem value="aadhar" id="addr-aadhar" className="mt-0.5" />
                                        <label htmlFor="addr-aadhar" className="cursor-pointer flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-sm font-medium">Aadhaar Address</span>
                                                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">Verified</span>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </RadioGroup>

                            {/* Show selected address details */}
                            {selectedAddress && (
                                <div className="mt-2 p-3 bg-background rounded-md border border-border space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selected Billing Address</p>
                                    <p className="text-sm">{selectedAddress.streetAddress}</p>
                                    <p className="text-sm text-muted-foreground">{[selectedAddress.city, selectedAddress.state, selectedAddress.postalCode].filter(Boolean).join(", ")}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Prompt when not all verifications done yet */}
                    {!showAddressSourcePicker && (
                        <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                {requiresPAN
                                    ? verification.aadhar
                                        ? "Aadhaar verified! Complete PAN verification to unlock billing address selection."
                                        : "Complete PAN & Aadhaar verification to auto-fetch and choose your billing address."
                                    : !verification.gst && !verification.aadhar
                                        ? "Complete GST & Aadhaar verification to auto-fetch and choose your billing address."
                                        : !verification.gst
                                            ? "Complete GST verification to unlock billing address selection."
                                            : "Complete Aadhaar verification to unlock billing address selection."}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ──────────────────────────────────────────────
                NON-INDIA: Didit identity verification + document uploads
            ────────────────────────────────────────────── */}
            {!isIndian && (
                <div className="space-y-6">
                    {/* ── Didit Identity Verification ── */}
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold">
                                Authorised Representative Identity Verification{" "}
                                <span className="text-destructive">*</span>
                            </h4>
                            {(diditStatus === "Approved" || diditStatus === "In Review") && (
                                <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">The authorised representative of the company must verify their identity using a valid government-issued photo ID (passport, national ID, or driver's licence).</p>

                        {/* Full Name field — only shown before verification or after decline */}
                        {(diditStatus === "Not Started" || diditStatus === "Declined" || diditStatus === "Pending") && (
                            <div className="space-y-1">
                                <Label className="text-sm">
                                    Full Name (as per ID document) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    value={representativeName || ""}
                                    onChange={(e) => onRepresentativeNameChange?.(e.target.value)}
                                    placeholder="Enter full legal name"
                                    disabled={diditStatus === "Pending"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter your full name exactly as shown on your government-issued ID.
                                </p>
                            </div>
                        )}

                        {/* Pending alert */}
                        {diditStatus === "Pending" && (
                            <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-400">
                                    <div className="flex items-center justify-between gap-3">
                                        <span>
                                            Verification popup is open. Complete it in the popup window, or cancel to start over.
                                        </span>
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
                        {diditStatus === "Declined" && (
                            <Alert className="border-red-300 bg-red-50 dark:bg-red-950/20">
                                <XCircle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-sm text-red-800 dark:text-red-400">
                                    Verification declined. Please try again with a valid ID.
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="button"
                            onClick={onVerifyDidit}
                            variant={(diditStatus === "Approved" || diditStatus === "In Review") ? "outline" : "default"}
                            className="w-full gap-2"
                            size="lg"
                        // disabled={
                        //     diditStatus === "Pending" ||
                        //     diditStatus === "Approved" ||
                        //     diditStatus === "In Review" ||
                        //     (!representativeName?.trim())
                        // }
                        >
                            {(diditStatus === "Approved" || diditStatus === "In Review") ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    {diditStatus === "Approved" ? "Identity Approved" : "Identity Under Review"}
                                </>
                            ) : diditStatus === "Pending" ? (
                                <>
                                    <Clock className="h-4 w-4 animate-spin" />
                                    Verification Pending…
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-5h2v2h-2zm0-8h2v6h-2z" />
                                    </svg>
                                    {diditStatus === "Declined" ? "Retry with Didit" : "Verify Identity with Didit"}
                                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                </>
                            )}
                        </Button>

                        {/* Status messages below the button */}
                        {diditStatus === "Approved" && (
                            <p className="text-sm text-green-600 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" />
                                Your identity has been verified successfully via Didit
                            </p>
                        )}
                        {diditStatus === "In Review" && (
                            <p className="text-sm text-blue-600 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Identity is under review — you can proceed
                            </p>
                        )}
                    </div>

                    {/* ── Business Document Upload ── */}
                    <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold">
                                Business Document Upload{" "}
                                <span className="text-destructive">*</span>
                            </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Upload official business registration documents for your enterprise.
                            At least one document is required for verification.
                        </p>

                        {/* Document type selector + upload trigger */}
                        <div className="flex gap-2">
                            {/* <Select
                                defaultValue="certificate_of_incorporation"
                                onValueChange={(v) => { selectedDocTypeRef.current = v; }}
                            >
                                <SelectTrigger className="bg-background border-border flex-1">
                                    <SelectValue placeholder="Select document type" />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                    {DOCUMENT_TYPES.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select> */}

                            {/* <Button
                                type="button"
                                variant="outline"
                                className="gap-2 shrink-0"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-4 w-4" />
                                Upload
                            </Button> */}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Accepted formats: PDF, JPG, JPEG, PNG · Max 10 MB per file
                        </p>

                        {/* Uploaded documents list */}
                        {uploadedDocuments.length > 0 && (
                            <div className="space-y-2 mt-2">
                                {uploadedDocuments.map((doc, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 p-3 rounded-md border border-border bg-background"
                                    >
                                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            {/* <p className="text-sm font-medium truncate">{doc.label}</p> */}
                                            <p className="text-xs text-muted-foreground truncate">{doc.file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3" /> Ready
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                            onClick={() => onDocumentRemove?.(idx)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Drop zone — always visible so users can keep adding files */}
                        <div
                            className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors
                                ${isDragging
                                    ? "border-primary bg-primary/10 scale-[1.01]"
                                    : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/10"
                                }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <Upload className={`h-8 w-8 mb-2 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                            <p className="text-sm text-muted-foreground">
                                {isDragging ? "Drop your file here" : "Click to upload or drag & drop your documents here"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10 MB</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};