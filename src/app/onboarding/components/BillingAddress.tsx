// app/onboarding/components/BillingAddress.tsx
"use client";

import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { MapPin } from "lucide-react";

interface BillingAddressProps {
    streetAddress: string;
    state: string;
    city: string;
    postalCode: string;
    readOnly?: boolean;
    isIndian?: boolean;

    onStreetAddressChange: (value: string) => void;
    onStateChange: (value: string) => void;
    onCityChange: (value: string) => void;
    onPostalCodeChange: (value: string) => void;
}

export const BillingAddress = ({
    streetAddress,
    state,
    city,
    postalCode,
    readOnly = false,
    isIndian = false,
    onStreetAddressChange,
    onStateChange,
    onCityChange,
    onPostalCodeChange,
}: BillingAddressProps) => {
    return (
        <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Billing Address
                {readOnly && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        Auto-filled from verification
                    </span>
                )}
            </h3>

            <div className="grid md:grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label>
                        Street Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        value={streetAddress}
                        onChange={(e) => onStreetAddressChange(e.target.value)}
                        placeholder="Enter street address"
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                    />
                </div>
                {/* <div className="space-y-2">
                    <Label>Street Address 2</Label>
                    <Input
                        value={streetAddress2}

                        onChange={(e) => onStreetAddress2Change(e.target.value)}
                        placeholder="Apt, floor, unit (optional)"
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                    />
                </div> */}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>
                        State <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        value={state}
                        onChange={(e) => onStateChange(e.target.value)}
                        placeholder="Enter state"
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                    />
                </div>
                <div className="space-y-2">
                    <Label>
                        City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        value={city}
                        onChange={(e) => onCityChange(e.target.value)}
                        placeholder="Enter city"
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                    />
                </div>
                <div className="space-y-2">
                    <Label>
                        Postal Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        value={postalCode}
                        onChange={(e) => onPostalCodeChange(e.target.value)}
                        placeholder="Enter postal code"
                        readOnly={readOnly}
                        className={readOnly ? "bg-muted/50" : ""}
                    />
                </div>
            </div>
        </div>
    );
};
