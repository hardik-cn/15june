"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Server, Globe, Cpu, Star, ShieldCheck, ArrowRight, AlertCircle, Mail, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';


export default function ResetPasswordForm() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get("token");

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        async function loadToken() {
            if (!token) {
                toast.error("Invalid reset link");
                router.push("/login");
                return;
            }

            try {
                const res = await fetch(`/api/auth/reset-password?token=${token}`);
                const data = await res.json();

                if (!data.success) {
                    toast.error("Invalid or expired reset link");
                    router.push("/login");
                    return;
                }

                setEmail(data.email);
            } catch {
                toast.error("Failed to validate reset link");
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }

        loadToken();
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password || password.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Reset failed");
            }

            toast.success("Password updated successfully");

            setTimeout(() => {
                router.push("/login");
            }, 1200);
        } catch (err: any) {
            toast.error(err.message || "Something went wrong");
        } finally {
            setSubmitting(false);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-zinc-500">Validating reset link...</p>
            </div>
        );
    }

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

                    <div className="mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-6">
                            <ShieldCheck className="w-7 h-7 text-black" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight mb-2">Set a New Password</h2>
                        <p className="text-zinc-500 leading-relaxed">Enter your new password below and confirm it to complete the password reset process.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* EMAIL */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider font-mulish text-zinc-400">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-4 py-4 bg-zinc-100 border border-zinc-200 text-black rounded-xl"
                            />
                        </div>

                        {/* PASSWORD */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider font-mulish text-zinc-400">New Password</label>

                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-4 pr-12 border text-black border-zinc-200 rounded-xl"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider font-mulish text-zinc-400">Confirm Password</label>

                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    className="w-full px-4 py-4 pr-12 border text-black border-zinc-200 rounded-xl"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword(!showConfirmPassword)
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-black text-white py-4 rounded-xl font-semibold disabled:opacity-50"
                        >
                            {submitting ? "Updating Password..." : "Reset Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}