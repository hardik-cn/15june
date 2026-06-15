"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { Loader2, Smartphone, Check, CheckCircle2, ArrowRight, ChevronDown, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { countryCodes } from "@/lib/countries";

type Step = "enter-new-mobile" | "verify-existing" | "verify-new";

interface ChangeMobileModalProps {
    open: boolean;
    onClose: () => void;
    currentPhone: string;
    currentCountryCode: string;
    onSuccess: (newPhone: string, newCountryCode: string) => void;
}

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function OtpInput({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
}) {
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (i: number, v: string) => {
        const digit = v.replace(/\D/g, "").slice(-1);
        const arr = value.padEnd(OTP_LENGTH, " ").split("");
        arr[i] = digit || " ";
        const next = arr.join("").trimEnd();
        onChange(next);
        if (digit && i < OTP_LENGTH - 1) {
            inputs.current[i + 1]?.focus();
        }
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace") {
            if (!value[i] || value[i] === " ") {
                if (i > 0) inputs.current[i - 1]?.focus();
            } else {
                const arr = value.padEnd(OTP_LENGTH, " ").split("");
                arr[i] = " ";
                onChange(arr.join("").trimEnd());
            }
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        onChange(pasted);
        const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
        inputs.current[focusIdx]?.focus();
    };

    return (
        <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const isFilled = value[i] && value[i] !== " ";
                return (
                    <input
                        key={i}
                        ref={(el) => { inputs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={isFilled ? value[i] : ""}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        disabled={disabled}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 bg-background outline-none transition-all duration-200 font-mono
                            ${isFilled
                                ? "border-primary text-foreground bg-primary/5 shadow-md shadow-primary/10 scale-105"
                                : "border-input/80 text-foreground/80 hover:border-input focus:border-primary/60"
                            }
                            focus:border-primary focus:bg-primary/5 focus:shadow-lg focus:shadow-primary/10 focus:scale-105
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                );
            })}
        </div>
    );
}

function ResendTimer({ onResend, disabled }: { onResend: () => void; disabled: boolean }) {
    const [seconds, setSeconds] = useState(RESEND_SECONDS);

    useEffect(() => {
        setSeconds(RESEND_SECONDS);
        const interval = setInterval(() => {
            setSeconds((s) => {
                if (s <= 1) { clearInterval(interval); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (seconds > 0) {
        return (
            <p className="text-sm text-muted-foreground text-center">
                Resend code in{" "}
                <span className="font-semibold text-primary tabular-nums bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                    {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
                </span>
            </p>
        );
    }

    return (
        <button
            type="button"
            onClick={onResend}
            disabled={disabled}
            className="text-sm text-primary font-semibold hover:text-primary/95 hover:underline disabled:opacity-50 w-full text-center transition-all"
        >
            Resend OTP
        </button>
    );
}

function CountrySelector({
    value,
    onChange,
}: {
    value: string;
    onChange: (code: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    const selected = countryCodes.find((c) => c.code === value) || countryCodes.find((c) => c.code === "+91");

    useEffect(() => {
        function handleOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    // Reset search query when open state changes
    useEffect(() => {
        if (!open) {
            setSearchQuery("");
        }
    }, [open]);

    const filteredCountries = countryCodes.filter((c) =>
        c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.includes(searchQuery) ||
        c.iso.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative shrink-0" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex items-center gap-2 px-3.5 h-11 bg-background hover:bg-muted/50 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all min-w-[110px] text-sm shadow-sm"
            >
                <span className="text-lg leading-none">{selected?.flag}</span>
                <span className="font-semibold text-foreground/90">{selected?.code}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform duration-250 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-2 w-72 max-h-[320px] bg-popover/98 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col scale-100 origin-top-left animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="p-2.5 border-b border-border/60 flex items-center gap-2 bg-muted/20">
                        <Search className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
                        <input
                            type="text"
                            placeholder="Search country..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-8 text-sm bg-transparent outline-none border-none placeholder:text-muted-foreground/60 text-foreground"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto max-h-[250px] py-1 divide-y divide-border/20 scrollbar-thin">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((c) => {
                                const isSelected = c.code === value;
                                return (
                                    <button
                                        key={c.iso}
                                        type="button"
                                        onClick={() => {
                                            onChange(c.code);
                                            setOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-muted/70 active:bg-muted transition-colors text-left ${isSelected ? "bg-primary/5 font-semibold text-primary" : "text-foreground"
                                            }`}
                                    >
                                        <span className="text-lg shrink-0 w-6 h-6 flex items-center justify-center bg-muted/40 rounded-full">{c.flag}</span>
                                        <span className="truncate flex-1">{c.country}</span>
                                        <span className="text-muted-foreground text-xs font-mono tabular-nums shrink-0 ml-2">{c.code}</span>
                                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-1.5" />}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                No countries found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function ChangeMobileModal({
    open,
    onClose,
    currentPhone,
    currentCountryCode,
    onSuccess,
}: ChangeMobileModalProps) {
    const [step, setStep] = useState<Step>("enter-new-mobile");
    const [newPhone, setNewPhone] = useState("");
    const [newCountryCode, setNewCountryCode] = useState("+91");
    const [existingOtp, setExistingOtp] = useState("");
    const [newOtp, setNewOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendKey, setResendKey] = useState(0);

    useEffect(() => {
        if (open) {
            setStep("enter-new-mobile");
            setNewPhone("");
            setNewCountryCode(currentCountryCode || "+91");
            setExistingOtp("");
            setNewOtp("");
            setLoading(false);
        }
    }, [open, currentCountryCode]);

    const maskPhone = (phone: string, code: string) => {
        if (!phone) return `${code} ****`;
        const visible = phone.slice(-4);
        return `${code} ${"*".repeat(Math.max(phone.length - 4, 4))}${visible}`;
    };

    const sendOtpToExisting = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/user/phone/send-otp", {
                method: "POST",
                body: JSON.stringify({ target: "existing" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            toast.success(`OTP sent to ${maskPhone(currentPhone, currentCountryCode)}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    }, [currentPhone, currentCountryCode]);

    const sendOtpToNew = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch("/api/user/phone/send-otp", {
                method: "POST",
                body: JSON.stringify({ target: "new", phone: newPhone, countryCode: newCountryCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send OTP");
            toast.success(`OTP sent to ${maskPhone(newPhone, newCountryCode)}`);
        } catch (err: any) {
            toast.error(err.message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    }, [newPhone, newCountryCode]);

    const handleContinueNewMobile = async () => {
        if (!newPhone.trim()) return toast.error("Please enter a mobile number.");
        if (!/^\d{6,15}$/.test(newPhone)) return toast.error("Please enter a valid mobile number.");
        if (newPhone === currentPhone && newCountryCode === currentCountryCode) {
            return toast.error("New number must be different from current number.");
        }

        await sendOtpToExisting();
        setStep("verify-existing");
        setResendKey((k) => k + 1);
    };

    const handleVerifyExisting = async () => {
        if (existingOtp.replace(/\s/g, "").length < OTP_LENGTH) return toast.error("Please enter the complete OTP.");

        setLoading(true);
        try {
            const res = await apiFetch("/api/user/phone/verify-otp", {
                method: "POST",
                body: JSON.stringify({ target: "existing", otp: existingOtp.replace(/\s/g, "") }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invalid OTP");

            await sendOtpToNew();
            setStep("verify-new");
            setResendKey((k) => k + 1);
        } catch (err: any) {
            toast.error(err.message || "OTP verification failed");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyNew = async () => {
        if (newOtp.replace(/\s/g, "").length < OTP_LENGTH) return toast.error("Please enter the complete OTP.");

        setLoading(true);
        try {
            const res = await apiFetch("/api/user/phone/verify-otp", {
                method: "POST",
                body: JSON.stringify({
                    target: "new",
                    phone: newPhone,
                    countryCode: newCountryCode,
                    otp: newOtp.replace(/\s/g, ""),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invalid OTP");

            toast.success("Mobile number updated successfully!");
            onSuccess(newPhone, newCountryCode);
            onClose();
        } catch (err: any) {
            toast.error(err.message || "OTP verification failed");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { key: "enter-new-mobile", label: "Enter Number" },
        { key: "verify-existing", label: "Current OTP" },
        { key: "verify-new", label: "New OTP" },
    ];
    const currentStepIdx = steps.findIndex((s) => s.key === step);

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[500px] p-0 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/5 gap-0 transition-all duration-300">
                {/* Header Section with subtle premium gradient background and rounded top corners */}
                <div className="px-8 pt-8 pb-6 border-b border-border/50 bg-gradient-to-b from-muted/30 via-muted/10 to-transparent rounded-t-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3.5 mb-2">
                            <div className="p-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl shadow-inner">
                                <Smartphone className="w-5 h-5 text-primary" />
                            </div>
                            <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
                                Change Mobile Number
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground/90 mt-1 leading-relaxed">
                            {step === "enter-new-mobile" && "Enter the new mobile number you'd like to use."}
                            {step === "verify-existing" && "Verify your identity with the code sent to your current number."}
                            {step === "verify-new" && "Enter the code sent to your new number to confirm."}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Perfectly Centered and Aligned Stepper Component */}
                    <div className="relative flex justify-between items-center w-full mt-6 px-1.5">
                        {/* Background Track Line */}
                        <div className="absolute left-10 right-10 top-4 h-[2px] bg-muted/80 rounded-full -translate-y-1/2 z-0">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-out"
                                style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
                            />
                        </div>

                        {steps.map((s, i) => {
                            const isCompleted = i < currentStepIdx;
                            const isActive = i === currentStepIdx;
                            return (
                                <div key={s.key} className="relative z-10 flex flex-col items-center w-20">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                                        ${isCompleted ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-100" : ""}
                                        ${isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md shadow-primary/30 scale-105" : ""}
                                        ${!isCompleted && !isActive ? "bg-muted/80 text-muted-foreground border border-border/50" : ""}
                                    `}>
                                        {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                                    </div>
                                    <span className={`text-[11px] mt-1.5 font-semibold text-center leading-tight transition-colors duration-300 whitespace-nowrap
                                        ${isActive ? "text-foreground font-bold" : isCompleted ? "text-primary font-semibold" : "text-muted-foreground/80"}
                                    `}>
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content Body */}
                <div className="px-8 py-8">
                    {/* Step 1: Enter new mobile */}
                    {step === "enter-new-mobile" && (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="font-semibold text-sm text-foreground/90 ml-0.5">New Mobile Number</Label>
                                <div className="flex gap-2">
                                    <CountrySelector value={newCountryCode} onChange={setNewCountryCode} />
                                    <Input
                                        type="tel"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                                        placeholder="Enter mobile number"
                                        className="flex-1 h-11 px-4 rounded-xl border border-input bg-background/50 hover:bg-background/80 focus:bg-background transition-all focus-visible:ring-primary/20 focus-visible:border-primary text-base font-medium shadow-sm placeholder:text-muted-foreground/60"
                                        onKeyDown={(e) => e.key === "Enter" && handleContinueNewMobile()}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed mt-1.5 ml-0.5">
                                    You'll use this number to receive verification messages, sign in, and secure your account.
                                </p>
                            </div>
                            <Button
                                onClick={handleContinueNewMobile}
                                disabled={loading || !newPhone.trim()}
                                className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] transition-all duration-150 font-semibold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>Continue <ArrowRight className="w-4 h-4 ml-0.5" /></>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Verify existing mobile OTP */}
                    {step === "verify-existing" && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <p className="font-semibold text-lg text-foreground">
                                    Enter OTP sent on <span className="text-primary font-bold">existing number</span>
                                </p>
                                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                                    We've sent a 6-digit code to{" "}
                                    <span className="font-semibold text-foreground/90 bg-muted/65 px-2.5 py-0.5 rounded-md border border-border/40 inline-flex items-center gap-1 font-mono text-xs shadow-sm">
                                        {maskPhone(currentPhone, currentCountryCode)}
                                    </span>
                                </p>
                            </div>

                            <div className="py-2">
                                <OtpInput
                                    value={existingOtp}
                                    onChange={setExistingOtp}
                                    disabled={loading}
                                />
                            </div>

                            <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                                <ResendTimer
                                    key={resendKey}
                                    onResend={sendOtpToExisting}
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-3">
                                <Button
                                    onClick={handleVerifyExisting}
                                    disabled={loading || existingOtp.replace(/\s/g, "").length < OTP_LENGTH}
                                    className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] transition-all duration-150 font-semibold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <>Verify &amp; Continue <ArrowRight className="w-4 h-4 ml-0.5" /></>
                                    )}
                                </Button>

                                <button
                                    type="button"
                                    onClick={() => setStep("enter-new-mobile")}
                                    disabled={loading}
                                    className="text-sm text-muted-foreground hover:text-foreground font-semibold w-full text-center transition-colors disabled:opacity-50 py-1"
                                >
                                    ← Back to change number
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Verify new mobile OTP */}
                    {step === "verify-new" && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <p className="font-semibold text-lg text-foreground">
                                    Enter OTP sent on <span className="text-primary font-bold">new number</span>
                                </p>
                                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                                    We've sent a 6-digit code to{" "}
                                    <span className="font-semibold text-foreground/90 bg-muted/65 px-2.5 py-0.5 rounded-md border border-border/40 inline-flex items-center gap-1 font-mono text-xs shadow-sm">
                                        {maskPhone(newPhone, newCountryCode)}
                                    </span>
                                </p>
                            </div>

                            <div className="py-2">
                                <OtpInput
                                    value={newOtp}
                                    onChange={setNewOtp}
                                    disabled={loading}
                                />
                            </div>

                            <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                                <ResendTimer
                                    key={resendKey}
                                    onResend={sendOtpToNew}
                                    disabled={loading}
                                />
                            </div>

                            <Button
                                onClick={handleVerifyNew}
                                disabled={loading || newOtp.replace(/\s/g, "").length < OTP_LENGTH}
                                className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 active:scale-[0.98] transition-all duration-150 font-semibold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm & Save Changes"}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
