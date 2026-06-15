// admin/login/page.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/routes";
import { setAccessToken } from "@/lib/auth/tokenStore";
import { toast } from "sonner";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, CopyIcon } from "./components/Icons";
import DottedPattern from "./components/DottedPattern";
import Spinner from "./components/Spinner";
import OTPInput from "./components/OTPInput";
import { Step, FormErrors } from "./types";
 
export default function AdminLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState<Step>("credentials");

    // Credentials form
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState<FormErrors>({ email: "", password: "", general: "" });

    // 2FA state
    const [setupSecret, setSetupSecret] = useState("");
    const [otpauthUrl, setOtpauthUrl] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");

 
    const validateForm = (): boolean => {
        const newErrors: FormErrors = { email: "", password: "", general: "" };
        let isValid = true;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = "Email is required.";
            isValid = false;
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = "Please enter a valid email address.";
            isValid = false;
        }

        if (!formData.password) {
            newErrors.password = "Password is required.";
            isValid = false;
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters.";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email, password: formData.password }),
                // skipAuth: true,
            });

            const data = await res.json();


            if (!res.ok || !data.success) {
                const msg = data.error || "Invalid credentials. Please try again.";
                setErrors((prev) => ({ ...prev, general: msg }));
                toast.error(msg);
                return;
            }

            // Route based on server response
            if (data.requires2FA) {
                if (data.requiresSetup) {
                    // New user: must set up 2FA first
                    // console.log("[Login] → Setup 2FA required. Secret:", data.secret);
                    // console.log("[Login] → OTPAuth URL:", data.otpauthUrl);
                    setSetupSecret(data.secret);
                    setOtpauthUrl(data.otpauthUrl);
                    setTwoFactorCode("");
                    setStep("setup-2fa");

                    toast.success("Set up your 2FA authenticator app to continue.");
                } else {
                    // Existing user: just verify OTP
                    // console.log("[Login] → 2FA verification required.");
                    setTwoFactorCode("");
                    setStep("verify-2fa");
                    toast.success("Enter your 2FA code to continue.");
                }
            } else {
                // No 2FA required — direct dashboard access
                // console.log("[Login] → Direct login. Access token received:", !!data.accessToken);
                if (data.accessToken) setAccessToken(data.accessToken);
                toast.success("Login successful");
                router.push(ADMIN_ROUTES.DASHBOARD);
            }
        } catch {
            const msg = "Something went wrong. Please try again.";
            setErrors((prev) => ({ ...prev, general: msg }));
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/admin/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: twoFactorCode }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.error || "Invalid or expired code. Please try again.");
                return;
            }

            if (data.accessToken) setAccessToken(data.accessToken);

            toast.success(step === "setup-2fa" ? "2FA Setup Complete! Welcome." : "2FA Verification successful!");
            setTimeout(() => {
                toast.success("Login successful!");
            }, 300);
            router.push(ADMIN_ROUTES.DASHBOARD);
        } catch {
            toast.error("Verification failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setStep("credentials");
        setTwoFactorCode("");
        setSetupSecret("");
        setOtpauthUrl("");
        setErrors({ email: "", password: "", general: "" });
    };

    const headingMap: Record<Step, { title: string; subtitle: string }> = {
        "credentials": {
            title: "Welcome back",
            subtitle: "Sign in to access your admin dashboard.",
        },
        "setup-2fa": {
            title: "Set Up 2FA",
            subtitle: "Scan the QR code with your authenticator app to secure your account.",
        },
        "verify-2fa": {
            title: "Two-Factor Auth",
            subtitle: "Enter the 6-digit code from your authenticator app.",
        },
    };

    const { title, subtitle } = headingMap[step];

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden">

            <div className="relative w-full max-w-3xl">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <Image
                        src="/logo/cantech-logo.svg"
                        alt="Cantech Logo"
                        width={180}
                        height={60}
                        className="h-14 w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        priority
                    />
                </div>

                {/* Ambient glow */}
                <div className="absolute -left-20 top-1/4 w-60 h-60 bg-gradient-to-br from-white/20 via-white/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                {/* Card */}
                <div className="relative bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0d0d0d] rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/50">
                    <div className="absolute -left-10 top-20 w-40 h-40 bg-gradient-to-r from-white/15 to-transparent rounded-full blur-2xl pointer-events-none" />
                    <DottedPattern />

                    <div className="relative z-10 p-8 sm:p-14">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold tracking-tight mb-3 text-white">{title}</h1>
                            <p className="text-white/50 text-base leading-relaxed">{subtitle}</p>
                        </div>

                        {/* ── Step: Credentials ── */}
                        {step === "credentials" && (
                            <form onSubmit={handleLogin} className="space-y-6">
                                {/* Email */}
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${errors.email ? "text-red-400" : "text-white/40 group-focus-within:text-white"}`}>
                                            <MailIcon />
                                        </span>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, email: e.target.value });
                                                if (errors.email) setErrors({ ...errors, email: "" });
                                            }}
                                            className={`w-full pl-12 pr-4 py-4 bg-white/[0.03] border rounded-xl text-white placeholder-white/30 focus:outline-none transition-all duration-300
                                                ${errors.email
                                                    ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                                    : "border-white/[0.1] focus:border-white/50 focus:bg-white/[0.08] focus:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                                }`}
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-400 text-xs pl-4">{errors.email}</p>}
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${errors.password ? "text-red-400" : "text-white/40 group-focus-within:text-white"}`}>
                                            <LockIcon />
                                        </span>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => {
                                                setFormData({ ...formData, password: e.target.value });
                                                if (errors.password) setErrors({ ...errors, password: "" });
                                            }}
                                            className={`w-full pl-12 pr-12 py-4 bg-white/[0.03] border rounded-xl text-white placeholder-white/30 focus:outline-none transition-all duration-300
                                                ${errors.password
                                                    ? "border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                                    : "border-white/[0.1] focus:border-white/50 focus:bg-white/[0.08] focus:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                                }`}
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-red-400 text-xs pl-4">{errors.password}</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="relative w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-white/90 rounded-xl text-black font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:hover:scale-100"
                                >
                                    {isLoading ? (
                                        <><Spinner /><span>Authenticating...</span></>
                                    ) : (
                                        <><span>Login</span><ArrowRightIcon /></>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* ── Step: Setup 2FA (new user — QR + verify) ── */}
                        {step === "setup-2fa" && (
                            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                                {/* QR Code */}
                                {/* Horizontal box: QR left | Key right */}
                                <div className="flex gap-4 p-4 bg-white/[0.03] border border-white/[0.07] rounded-2xl">

                                    {/* Left — QR Code */}
                                    <div className="flex-shrink-0 p-2.5 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                                        {otpauthUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(otpauthUrl)}&margin=0`}
                                                alt="2FA QR Code"
                                                width={140}
                                                height={140}
                                                className="w-[140px] h-[140px] object-contain rounded-md"
                                            />
                                        ) : (
                                            <div className="w-[140px] h-[140px] flex items-center justify-center bg-white/10 rounded-lg">
                                                <Spinner />
                                            </div>
                                        )}
                                    </div>

                                    {/* Right — Instructions + Manual Key */}
                                    <div className="flex flex-col justify-between flex-1 min-w-0 gap-3">
                                        {/* OTP Input inside the box */}
                                        {/* OTP Input inside the box (Monochrome style) */}
                                        <div className="space-y-2">
                                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] ml-1">Enter 6-digit Code</p>
                                            <OTPInput
                                                value={twoFactorCode}
                                                onChange={setTwoFactorCode}
                                                isLoading={isLoading}
                                                monochrome={true}
                                            />
                                        </div>

                                        {/* Manual Key */}
                                        <div className="space-y-1">
                                            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.15em]">Or enter key manually</p>
                                            <div
                                                onClick={() => { navigator.clipboard.writeText(setupSecret); toast.success("Key copied!"); }}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 border border-white/[0.07] rounded-lg cursor-pointer group hover:border-white/20 transition-all duration-200 w-full overflow-hidden"
                                            >
                                                <code className="text-white/60 text-[11px] tracking-widest truncate flex-1">{setupSecret}</code>
                                                <span className="flex-shrink-0 text-white/20 group-hover:text-white/50 transition-colors"><CopyIcon /></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <button
                                    type="submit"
                                    disabled={isLoading || twoFactorCode.length !== 6}
                                    className="relative w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-white/90 rounded-xl text-black font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:hover:scale-100"
                                >
                                    {isLoading ? (
                                        <><Spinner /><span>Completing Setup...</span></>
                                    ) : (
                                        <span>Complete Setup & Continue</span>
                                    )}
                                </button>

                                <button type="button" onClick={handleBackToLogin} className="w-full text-sm text-white/40 hover:text-white transition-colors">
                                    ← Back to Login
                                </button>
                            </form>
                        )}

                        {/* ── Step: Verify 2FA (existing user) ── */}
                        {step === "verify-2fa" && (
                            <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                                <div className="py-4">
                                    <OTPInput
                                        value={twoFactorCode}
                                        onChange={setTwoFactorCode}
                                        isLoading={isLoading}
                                        monochrome={true}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || twoFactorCode.length !== 6}
                                    className="relative w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-white/90 rounded-xl text-black font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:hover:scale-100"
                                >
                                    {isLoading ? (
                                        <><Spinner /><span>Verifying...</span></>
                                    ) : (
                                        <span>Verify Code</span>
                                    )}
                                </button>

                                <button type="button" onClick={handleBackToLogin} className="w-full text-sm text-white/40 hover:text-white transition-colors">
                                    ← Back to Login
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}