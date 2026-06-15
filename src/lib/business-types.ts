export const businessTypeOptions = [
    {
        value: "sole_proprietorship",
        label: "Sole Proprietorship",
    },
    {
        value: "private_limited",
        label: "Private Limited Company (Pvt. Ltd)",
    },
    {
        value: "public_limited",
        label: "Public Limited Company (Ltd)",
    },
    {
        value: "llp",
        label: "Limited Liability Partnership (LLP)",
    },
    {
        value: "opc",
        label: "One Person Private Limited Company (OPC Pvt Ltd)",
    },
    {
        value: "partnership",
        label: "Partnership Firm",
    },
] as const;

export const getBusinessTypeLabel = (
    businessType?: string | null
): string => {
    if (!businessType) return "N/A";

    return (
        businessTypeOptions.find(
            (item) => item.value === businessType
        )?.label || businessType
    );
};