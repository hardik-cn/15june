// src/lib/countries.ts
import { countries } from "country-data-list";

export interface CountryOption {
    country: string;
    code: string;
    iso: string;
    flag: string;
}

function isoToFlag(iso: string): string {
    return iso
        .toUpperCase()
        .replace(/./g, char =>
            String.fromCodePoint(127397 + char.charCodeAt(0))
        );
}

export const countryCodes: CountryOption[] = countries.all
    .filter(country => country.alpha2)
    .map(country => ({
        country: country.name,
        iso: country.alpha2,
        code: country.countryCallingCodes?.[0]?.replace(" ", "") || "",
        flag: isoToFlag(country.alpha2),
    }))
    .filter(country => country.code)
    .sort((a, b) => a.country.localeCompare(b.country));

export const countryList = countries.all
    .map((country) => country.name)
    .sort((a, b) => a.localeCompare(b));
