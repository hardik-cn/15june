// src/app/login/components/AppSetup.tsx
"use client";

import { useState } from "react";

interface Props {
    qrCode: string;
    isLoading: boolean;
    onVerify: (code: string) => void;
}

export function AppSetup({
    qrCode,
    isLoading,
    onVerify
}: Props) {

    const [code, setCode] = useState("");

    return (
        <div className="space-y-6">

            <div className="text-center">
                <h2 className="text-2xl font-bold">
                    Setup Authenticator
                </h2>

                <p className="text-zinc-500 mt-2">
                    Scan the QR code using Google Authenticator
                </p>
            </div>

            <div className="flex justify-center">
                <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64"
                />
            </div>

            <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full border rounded-xl px-4 py-3"
            />

            <button
                disabled={isLoading}
                onClick={() => onVerify(code)}
                className="w-full bg-black text-white py-3 rounded-xl"
            >
                {isLoading
                    ? "Verifying..."
                    : "Verify & Continue"}
            </button>

        </div>
    );

}