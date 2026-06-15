// src/app/components/dashboard/KYCPopup.tsx
"use client";
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useKycPopup } from "@/lib/kyc/KycContext";

interface KYCPopupProps {
    onboardingId?: string;
    popupType?: "review" | "required" | null;
}

export function KYCPopup({ onboardingId, popupType }: KYCPopupProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { closePopup } = useKycPopup();

    useEffect(() => {
        if (popupType === "review" || popupType === "required") {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [popupType]);

    const handleCompleteKYC = () => {
        setOpen(false);
        closePopup();
        if (onboardingId) {
            router.push(
                `/onboarding?id=${onboardingId}`
            );
            return;
        }
        router.push("/onboarding");
    };

    return (
        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { if (popupType === "required") { (true); } closePopup(); } }}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                            <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>

                        <DialogTitle className="text-xl">
                            {popupType === "review"
                                ? "KYC Under Review"
                                : "KYC Required"}
                        </DialogTitle>
                    </div>

                    <DialogDescription className="pt-4 text-base">
                        {popupType === "review" ? (
                            <>
                                Thank you for choosing Cantech Networks! <br />
                                Your KYC is currently <b>under review</b>.
                                This may take <b>2–3 business days</b>.
                            </>
                        ) : (
                            <>
                                To proceed with this action, we kindly request you to complete the Know Your Customer (KYC) verification process.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    {popupType !== "review" && (
                        <>
                            <Button variant="outline" onClick={() => { setOpen(false); closePopup(); }}>Later</Button>
                            <Button onClick={handleCompleteKYC}>
                                Complete KYC Now
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}