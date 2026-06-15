"use client";

import { Checkbox } from "@/app/components/ui/checkbox";

interface TermsAndConditionsProps {
    termsAccepted: boolean;
    privacyAccepted: boolean;
    onTermsChange: (checked: boolean) => void;
    onPrivacyChange: (checked: boolean) => void;
}

export const TermsAndConditions = ({
    termsAccepted,
    privacyAccepted,
    onTermsChange,
    onPrivacyChange,
}: TermsAndConditionsProps) => {
    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => onTermsChange(checked as boolean)}
                />
                <label
                    htmlFor="terms"
                    className="text-sm cursor-pointer"
                >
                    I agree to the{" "}
                    <span className="text-primary hover:underline cursor-pointer">
                        Terms & Conditions
                    </span>{" "}
                    <span className="text-destructive">*</span>
                </label>
            </div>

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="privacy"
                    checked={privacyAccepted}
                    onCheckedChange={(checked) => onPrivacyChange(checked as boolean)}
                />
                <label
                    htmlFor="privacy"
                    className="text-sm cursor-pointer"
                >
                    I agree to the{" "}
                    <span className="text-primary hover:underline cursor-pointer">
                        Privacy Policy
                    </span>{" "}
                    <span className="text-destructive">*</span>
                </label>
            </div>
        </div>
    );
};
