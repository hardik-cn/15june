// src/app/forgot-password/page.tsx
"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
    Server,
    Globe,
    Cpu,
    Star,
    ShieldCheck,
    ArrowRight,
    AlertCircle,
    Mail,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';
import { toast } from "sonner";

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState<string | undefined>();
    const [emailTouched, setEmailTouched] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const validateEmail = (value: string): string | undefined => {
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
        return undefined;
    };

    const handleBlur = () => {
        setEmailTouched(true);
        setEmailError(validateEmail(email));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setEmailTouched(true);

        const error = validateEmail(email);
        setEmailError(error);

        if (error) {
            toast.error("Please enter a valid email address");
            return;
        }

        try {
            setIsLoading(true);

            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                }),
            });

            const data = await res.json();

            setIsLoading(false);

            if (data.success) {
                setSubmitted(true);

                // security → don't reveal if email exists
                toast.success(
                    "If the email exists, a reset link has been sent."
                );
            } else {
                toast.error(data.error || "Failed to send reset link");
            }

        } catch (error) {
            setIsLoading(false);
            toast.error("Something went wrong. Please try again.");
        }
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
                        Account <span className="text-zinc-500">Recovery.</span>
                    </h1>

                    <p className="text-zinc-400 text-lg max-w-md mb-10 leading-relaxed">
                        Securely recover access to your account. We'll send a reset link straight to your inbox.
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

            {/* Right Section: Reset Form */}
            <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-24 bg-white text-black">
                <div className="max-w-md w-full mx-auto">

                    {/* Mobile Logo */}
                    <div className="md:hidden flex items-center gap-2 mb-12">
                        <Image src="/logo/cantech-logo-dark.svg" alt="Logo" width={130} height={55} />
                    </div>

                    {!submitted ? (
                        <>
                            {/* Header */}
                            <div className="mb-10">
                                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6">
                                    <Mail className="w-7 h-7 text-black" />
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight mb-2">Reset your password</h2>
                                <p className="text-zinc-500 leading-relaxed">
                                    Forgotten your password? Enter your email address below and we'll send you a link to reset it.
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label
                                        className="text-xs font-bold uppercase tracking-wider font-mulish text-zinc-400"
                                        htmlFor="reset-email"
                                    >
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="reset-email"
                                            type="email"
                                            required
                                            className={`w-full px-4 py-4 pl-12 bg-zinc-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all ${emailTouched && emailError ? 'border-red-500' : 'border-zinc-200'
                                                }`}
                                            placeholder="name@company.com"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                if (emailTouched) setEmailError(validateEmail(e.target.value));
                                            }}
                                            onBlur={handleBlur}
                                        />
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                                    </div>
                                    {emailTouched && emailError && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {emailError}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    id="reset-submit-btn"
                                    disabled={isLoading}
                                    className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="mt-8 text-center text-sm text-zinc-500">
                                Remember your password?{" "}
                                <Link href="/login" className="font-bold text-black hover:underline">
                                    Back to Login
                                </Link>
                            </p>
                        </>
                    ) : (
                        /* Success State */
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-black" />
                            </div>
                            <h2 className="text-3xl font-bold tracking-tight mb-3">Check your inbox</h2>
                            <p className="text-zinc-500 leading-relaxed mb-2">
                                We've sent a password reset link to
                            </p>
                            <p className="font-bold text-black mb-8">{email}</p>
                            <p className="text-sm text-zinc-400 mb-10">
                                Didn't receive the email? Check your spam folder, or{" "}
                                <button
                                    onClick={() => { setSubmitted(false); setEmail(''); setEmailTouched(false); setEmailError(undefined); }}
                                    className="font-bold text-black hover:underline"
                                >
                                    try another address
                                </button>
                                .
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-black transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
