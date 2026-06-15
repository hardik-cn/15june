"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { User, Building2 } from "lucide-react";

type AccountType = "individual" | "enterprise" | null;

interface AccountTypeSelectionProps {
    accountType: AccountType;
    onAccountTypeChange: (type: AccountType) => void;
}

export const AccountTypeSelection = ({
    accountType,
    onAccountTypeChange,
}: AccountTypeSelectionProps) => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Identity Verification</h3>
            <div className="grid md:grid-cols-2 gap-4">
                <Card
                    className={`cursor-pointer transition-all hover:border-primary ${accountType === "individual" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                    onClick={() => onAccountTypeChange("individual")}
                >
                    <CardContent className="p-6 text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-semibold text-foreground">Individual</h4>
                        <p className="text-sm text-muted-foreground">Personal account</p>
                    </CardContent>
                </Card>

                <Card
                    className={`cursor-pointer transition-all hover:border-primary ${accountType === "enterprise" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                    onClick={() => onAccountTypeChange("enterprise")}
                >
                    <CardContent className="p-6 text-center">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                            <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-semibold text-foreground">Enterprise</h4>
                        <p className="text-sm text-muted-foreground">Business account</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
