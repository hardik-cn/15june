// src/lib/admin/verification-constants.ts

// =============================
// KYC TAB ORDER
// =============================
export const KYC_TAB_ORDER = [
    "digilocker",
    "gst",
    "cin",
    "pan",
    "IdentityVerified",
    "document",
] as const;

// =============================
// KYC VERIFICATION TYPE
// =============================
export type KycVerificationType = (typeof KYC_TAB_ORDER)[number];

// =============================
// KYC VERIFICATION LABELS
// =============================
export const KYC_VERIFICATION_LABELS: Record<KycVerificationType, string> = {
    digilocker: "DigiLocker verified e-Aadhaar",
    gst: "GST Identification Number (GSTIN)",
    cin: "Corporate Identification Number (CIN)",
    pan: "Permanent Account Number (PAN)",
    IdentityVerified: "Identity Verified",
    document: "Document Verified",
};

// =============================
// KYC TAB LABELS
// =============================
export const KYC_TAB_LABELS: Record<KycVerificationType, string> = {
    digilocker: "e-Aadhaar",
    gst: "GST Verification",
    cin: "CIN Verification",
    pan: "PAN Verification",
    IdentityVerified: "Identity Verified",
    document: "Document Verified",
};

// =============================
// GET VERIFICATION LABEL
// =============================
export function getVerificationLabel(type: string): string {
    return KYC_VERIFICATION_LABELS[type as KycVerificationType] ?? type;
}

// =============================
// GET TAB LABEL
// =============================
export function getTabLabel(type: string): string {
    return KYC_TAB_LABELS[type as KycVerificationType] ?? type;
}

// =============================
// VALIDATE KYC TYPE
// =============================
export function isKycVerificationType(type: string): type is KycVerificationType {
    return KYC_TAB_ORDER.includes(type as KycVerificationType);
}