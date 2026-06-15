export function normalizePhone(
    countryCode: string,
    phone: string
) {
    const cleanPhone = phone.replace(/\D/g, "");

    const cleanCode = countryCode.startsWith("+")
        ? countryCode
        : `+${countryCode}`;

    return `${cleanCode}${cleanPhone}`;
}