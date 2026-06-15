"use client";

import { Label } from "@/app/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { Info } from "lucide-react";
import { countryList } from "@/lib/countries";

interface BillingCountrySelectorProps {
    selectedCountry: string;
    onCountryChange: (country: string) => void;
    billingCurrency: string;
}

export const BillingCountrySelector = ({
    selectedCountry,
    onCountryChange,
    billingCurrency,
}: BillingCountrySelectorProps) => {
    return (
        <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="text-primary">
                    Select Billing Country <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedCountry} onValueChange={onCountryChange}>
                    <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                        {countryList.map((country) => (
                            <SelectItem key={country} value={country}>
                                {country}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedCountry && (
                <div className="flex items-end">
                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 w-full">
                        <Info className="h-4 w-4 text-primary" />
                        <span className="text-sm text-primary">
                            Billing currency will be {billingCurrency}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
