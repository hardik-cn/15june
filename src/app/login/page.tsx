// src/app/login/page.tsx
"use client";
import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import Image from 'next/image';
import Link from 'next/link';
import {
    ShieldCheck,
    Server,
    Globe,
    Cpu,
    Star,
    CheckCircle2,
    ArrowRight,
    Eye,
    EyeOff,
    AlertCircle
} from 'lucide-react';
import { toast } from "sonner";
import { setAccessToken } from "@/lib/auth/tokenStore";

// 2FA Components
import { TwoFactorSelection, TwoFactorMethodType } from "./components/TwoFactorSelection";
import { SmsVerification } from "./components/SmsVerification";
import { EmailVerification } from "./components/EmailVerification";
import { AppVerification } from "./components/AppVerification";
// import { AppSetup } from "./components/AppSetup";

type FormErrors = {
    email?: string;
    password?: string;
};

type LoginStep = "login" | "2fa_selection" | "2fa_verify";

export default function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

    // 2FA State
    const [step, setStep] = useState<LoginStep>("login");
    const [availableMethods, setAvailableMethods] = useState<TwoFactorMethodType[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethodType | null>(null);
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [userPhone, setUserPhone] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [setupQRCode, setSetupQRCode] = useState("");


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = validateForm();
        setTouched({ email: true, password: true });

        if (!isValid) {
            toast.error("Please fix the errors before continuing");
            return;
        }

        try {
            setIsLoading(true);

            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            setIsLoading(false);

            if (!res.ok) {
                toast.error(data.error || "Invalid email or password");
                return;
            }

            if (data.require2FASetup) {

                const qrRes = await fetch(
                    "/api/auth/login/setup-app",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            tempToken: data.tempToken
                        })
                    }
                );

                const qrData = await qrRes.json();

                setTempToken(data.tempToken);

                setSelectedMethod("APP");

                setStep("2fa_verify");

                setAvailableMethods(["APP"]);

                setSetupQRCode(qrData.qrCode);

                return;
            }

            if (data.require2FA) {
                setAvailableMethods(data.methods);
                setTempToken(data.tempToken);
                setUserPhone(data.phone || "");
                setUserEmail(data.email || "");

                if (data.methods.length === 1) {
                    const method = data.methods[0];
                    setSelectedMethod(method);
                    setStep("2fa_verify");
                    if (method === "SMS") {
                        await sendSMSLoginOTP(data.phone);
                    }
                } else {
                    setStep("2fa_selection");
                }
                return;
            }

            setAccessToken(data.accessToken);

            toast.success("Welcome back 👋");
            window.location.href = "/dashboard";

        } catch (err) {
            setIsLoading(false);
            toast.error("Something went wrong. Please try again.");
        }
    };

    const handle2FAVerify = async (code: string) => {
        try {
            setIsLoading(true);

            const res = await fetch("/api/auth/login/verify-2fa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tempToken,
                    code,
                    method: selectedMethod
                }),
            });

            const data = await res.json();
            setIsLoading(false);

            if (!res.ok) {
                toast.error(data.message || "Invalid verification code");
                return;
            }

            setAccessToken(data.accessToken);
            toast.success("Identity verified successfully");
            window.location.href = "/dashboard";

        } catch (err) {
            console.error("2FA error:", err);
            setIsLoading(false);
            toast.error("Verification failed");
        }
    };

    const sendSMSLoginOTP = async (
        phone: string
    ) => {

        try {

            const res = await fetch(
                "/api/otp/phone",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        phone
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {

                toast.error(
                    data.error || "Failed to send OTP"
                );

                return;
            }

            toast.success(
                "Verification code sent"
            );

        } catch {

            toast.error(
                "Failed to send OTP"
            );

        }

    };

    // Validation functions
    const validateEmail = (value: string): string | undefined => {
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
        return undefined;
    };
    const validatePassword = (value: string): string | undefined => {
        if (!value.trim()) return 'Password is required';
        if (value.length < 5) return 'Password must be at least 5 characters';
        return undefined;
    };

    const handleBlur = (field: 'email' | 'password') => {
        setTouched(prev => ({ ...prev, [field]: true }));
        validateForm();
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {
            email: validateEmail(email),
            password: validatePassword(password),
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== undefined);
    };

    const services = [
        { icon: <Server className="w-4 h-4" />, name: "Cloud Hosting" },
        { icon: <Globe className="w-4 h-4" />, name: "Domain Registration" },
        { icon: <Cpu className="w-4 h-4" />, name: "Dedicated Servers" }
    ];

    const avatars = [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=64&h=64&q=80"
    ];

    return (
        <div className="min-h-screen bg-black text-white flex flex-col md:flex-row font-sans selection:bg-white selection:text-black">

            {/* Left Section: Information & Social Proof */}
            <div className="hidden md:flex md:w-1/2 lg:w-3/5 p-12 lg:p-24 flex-col justify-between relative overflow-hidden bg-gradient-to-br from-zinc-900 via-black to-zinc-900">
                {/* Subtle decorative background element */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-12">
                        <Image src="/logo/cantech-logo.svg" alt="Logo" width={130} height={55} />
                    </div>

                    <h1 className="text-3xl lg:text-5xl font-extrabold leading-tight mb-8">
                        Enterprise <span className="text-zinc-500">Infrastructure.</span>
                    </h1>

                    <p className="text-zinc-400 text-lg max-w-md mb-10 leading-relaxed">
                        Deploy your applications on our high-performance global network. Managed solutions for scale-hungry businesses.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        {services.map((service, i) => (
                            <div key={i} className="flex items-center gap-3 group cursor-default">
                                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                                    {service.icon}
                                </div>
                                <span className="text-zinc-300 group-hover:text-white transition-colors">{service.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 mt-4 space-y-8">
                    {/* Trustpilot Review Section */}
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex gap-1 text-green-500">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>
                            <span className="text-sm font-medium">Trustpilot 4.9/5</span>
                        </div>
                        <p className="text-zinc-300 italic mb-4">"The fastest deployment I've ever experienced. Their support team is available 24/7 and actually knows what they're doing."</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={avatars[0]} className="w-8 h-8 rounded-full border border-white/20" alt="User" />
                                <div>
                                    <p className="text-sm font-bold">Marcus Thorne</p>
                                    <p className="text-xs text-zinc-500">CTO, Vertex Media</p>
                                </div>
                            </div>
                            <ShieldCheck className="w-5 h-5 text-white/20" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {avatars.map((url, i) => (
                                <img key={i} src={url} className="w-10 h-10 rounded-full border-2 border-black" alt="Customer" />
                            ))}
                        </div>
                        <div className="text-sm">
                            <span className="font-bold text-white">12k+</span>
                            <span className="text-zinc-500 ml-1">users trusting our cloud</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Section: Login Form / 2FA */}
            <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-24 bg-white text-black">
                <div className="max-w-md w-full mx-auto">
                    <div className="md:hidden flex items-center gap-2 mb-12">
                        <Image src="/logo/cantech-logo-dark.svg" alt="Logo" width={130} height={55} />
                    </div>

                    {step === "login" && (
                        <>
                            <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h2>
                                <p className="text-zinc-500">Enter your credentials to manage your servers.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider font-mulish text-zinc-400" htmlFor="email">Work Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        required
                                        className={`w-full px-4 py-4 bg-zinc-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all ${touched.email && errors.email ? 'border-red-500' : 'border-zinc-200'
                                            }`}
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onBlur={() => handleBlur('email')}
                                    />
                                    {touched.email && errors.email && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold uppercase tracking-wider font-mulish text-zinc-400" htmlFor="password">Password</label>
                                        <Link href="/forgot-password" className="text-xs font-mulish font-bold text-black hover:underline">Forgot?</Link>
                                    </div>
                                    <div className="relative">
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className={`w-full px-4 py-4 pr-12 bg-zinc-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all ${touched.password && errors.password
                                                ? 'border-red-500'
                                                : 'border-zinc-200'
                                                }`}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onBlur={() => handleBlur('password')}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {touched.password && errors.password && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="remember" className="w-4 h-4 border-zinc-300 rounded focus:ring-black" />
                                    <label htmlFor="remember" className="text-sm text-zinc-600">Keep me logged in for 30 days</label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Login
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="mt-8 text-center text-sm text-zinc-500">
                                Don't have an account? <Link href="/register" className="font-bold text-black hover:underline">Sign up</Link>
                            </p>
                        </>
                    )}

                    {step === "2fa_selection" && (
                        <TwoFactorSelection
                            methods={availableMethods}
                            isLoading={isLoading}
                            onSelect={async (method) => {
                                setSelectedMethod(method);
                                setStep("2fa_verify");
                                if (method === "SMS") {
                                    await sendSMSLoginOTP(userPhone);
                                }
                            }}
                        />
                    )}

                    {step === "2fa_verify" && (
                        <>
                            {selectedMethod === "SMS" && (
                                <SmsVerification
                                    phoneNumber={userPhone}
                                    isLoading={isLoading}
                                    onVerify={handle2FAVerify}
                                    onResend={() => toast.info("New code sent to your phone")}
                                    onBack={availableMethods.length > 1 ? () => setStep("2fa_selection") : undefined}
                                />
                            )}
                            {selectedMethod === "EMAIL" && (
                                <EmailVerification
                                    email={userEmail}
                                    isLoading={isLoading}
                                    onVerify={handle2FAVerify}
                                    onResend={() => toast.info("New code sent to your email")}
                                    onBack={availableMethods.length > 1 ? () => setStep("2fa_selection") : undefined}
                                />
                            )}
                            {selectedMethod === "APP" && (
                                <AppVerification
                                    isLoading={isLoading}
                                    onVerify={handle2FAVerify}
                                    qrCodeUrl={setupQRCode}
                                    onBack={
                                        availableMethods.length > 1
                                            ? () => setStep("2fa_selection")
                                            : undefined
                                    }
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}