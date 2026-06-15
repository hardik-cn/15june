"use client";

import React, { useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";

interface SmsVerificationProps {
    phoneNumber: string;
    onVerify: (code: string) => void;
    onResend: () => void;
    onBack?: () => void;
    isLoading?: boolean;
}

export function SmsVerification({ phoneNumber, onVerify, onResend, onBack, isLoading }: SmsVerificationProps) {
    const [code, setCode] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length === 6) {
            onVerify(code);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-8">
                <div className="mx-auto w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/10">
                    <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-black">SMS Verification</h2>
                <p className="text-zinc-500 text-sm">
                    We've sent a 6-digit code to <span className="text-black font-semibold">{phoneNumber}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400" htmlFor="code">Verification Code</label>
                    <input
                        id="code"
                        type="text"
                        maxLength={6}
                        required
                        autoFocus
                        className="w-full px-4 py-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-center text-2xl tracking-[0.5em] font-mono"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Verify & Login
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center">
                <button
                    onClick={onResend}
                    className="text-sm font-bold text-black hover:underline"
                >
                    Didn't receive a code? Resend
                </button>
            </div>

            {onBack && (
                <button
                    onClick={onBack}
                    className="w-full py-2 text-sm font-bold text-zinc-400 hover:text-black transition-colors"
                >
                    Try another way
                </button>
            )}
        </div>
    );
}
