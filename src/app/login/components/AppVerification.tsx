// src/app/login/components/AppVerification.tsx
"use client";

import React, { useState } from "react";
import { Smartphone, ShieldCheck, ArrowRight, QrCode } from "lucide-react";

interface AppVerificationProps {
    onVerify: (code: string) => void;
    onBack?: () => void;
    isLoading?: boolean;
    qrCodeUrl?: string; // Optional QR code if needed
}

export function AppVerification({ onVerify, onBack, isLoading, qrCodeUrl }: AppVerificationProps) {
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
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-black">App Authenticator</h2>
                <p className="text-zinc-500 text-sm">
                    {qrCodeUrl
                        ? "Scan the QR code and enter the 6-digit code from your authenticator app."
                        : "Enter the 6-digit code from your authenticator app."
                    }
                </p>
            </div>

            {/* QR Code Section (Requested by user) */}
            {qrCodeUrl && (
                <div className="flex flex-col items-center justify-center p-6 bg-zinc-50 rounded-2xl border border-zinc-100 mb-6 group transition-all hover:bg-zinc-100/50">
                    <div className="relative w-40 h-40 bg-white rounded-xl border border-zinc-200 flex items-center justify-center overflow-hidden shadow-sm">

                        <img
                            src={qrCodeUrl}
                            alt="QR Code"
                            className="w-full h-full p-2"
                        />

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </div>

                    <p className="mt-4 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                        Scan Using Authenticator App
                    </p>
                </div>
            )}

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
