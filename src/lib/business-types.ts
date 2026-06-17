// src/lib/business-types.ts

// =============================
// BUSINESS TYPE OPTIONS
// =============================
export const businessTypeOptions = [
    { value: "sole_proprietorship", label: "Sole Proprietorship" },
    { value: "private_limited", label: "Private Limited Company (Pvt. Ltd)" },
    { value: "public_limited", label: "Public Limited Company (Ltd)" },
    { value: "llp", label: "Limited Liability Partnership (LLP)" },
    { value: "opc", label: "One Person Private Limited Company (OPC Pvt Ltd)" },
    { value: "partnership", label: "Partnership Firm" },
] as const;

// =============================
// GET BUSINESS TYPE LABEL
// =============================
export const getBusinessTypeLabel = (businessType?: string | null): string => {
    // =============================
    // STEP 1: VALIDATE INPUT
    // =============================
    if (!businessType) {
        return "N/A";
    }

    // =============================
    // STEP 2: FIND MATCHING LABEL
    // =============================
    const businessTypeRecord = businessTypeOptions.find((item) => item.value === businessType);

    // =============================
    // STEP 3: RETURN LABEL
    // =============================
    return businessTypeRecord?.label || businessType;
};