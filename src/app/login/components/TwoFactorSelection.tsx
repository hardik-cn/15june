"use client";

import React from "react";
import { Shield, MessageSquare, Mail, Smartphone, ArrowRight } from "lucide-react";

export type TwoFactorMethodType = "SMS" | "EMAIL" | "APP";

interface TwoFactorSelectionProps {
    methods: TwoFactorMethodType[];
    onSelect: (method: TwoFactorMethodType) => void;
    isLoading?: boolean;
}

export function TwoFactorSelection({ methods, onSelect, isLoading }: TwoFactorSelectionProps) {
    const methodDetails = {
        SMS: {
            title: "Text Message",
            description: "Get a code via SMS",
            icon: <MessageSquare className="w-5 h-5" />,
        },
        EMAIL: {
            title: "Email Address",
            description: "Get a code via email",
            icon: <Mail className="w-5 h-5" />,
        },
        APP: {
            title: "Authenticator App",
            description: "Get a code from your app",
            icon: <Smartphone className="w-5 h-5" />,
        },
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mb-8">
                <div className="mx-auto w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/10">
                    <Shield className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-black">Two-Step Verification</h2>
                <p className="text-zinc-500 text-sm">Choose a method to verify your identity.</p>
            </div>

            <div className="grid gap-3">
                {methods.map((method) => (
                    <button
                        key={method}
                        onClick={() => onSelect(method)}
                        disabled={isLoading}
                        className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 hover:border-black hover:bg-zinc-50 transition-all group text-left disabled:opacity-50"
                    >
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                            {methodDetails[method].icon}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-black">{methodDetails[method].title}</h3>
                            <p className="text-xs text-zinc-500">{methodDetails[method].description}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-black transition-colors" />
                    </button>
                ))}
            </div>
        </div>
    );
}
