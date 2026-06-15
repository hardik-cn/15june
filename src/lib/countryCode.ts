// src/lib/countryCode.ts
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

export function countryNameToISO(
    countryName?: string | null
): string {
    if (!countryName) {
        return "IN";
    }

    const normalized = countryName.trim();

    // Special cases
    const aliases: Record<string, string> = {
        UAE: "United Arab Emirates",
        USA: "United States",
        UK: "United Kingdom",
    };

    const lookupName = aliases[normalized] ?? normalized;

    const code = countries.getAlpha2Code(
        lookupName,
        "en"
    );

    return code ?? "IN";
}