// app/admin/2fa-setup/page.tsx

"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardWrapper from "../components/AdminDashboardWrapper";
import { adminFetch } from "@/lib/admin/adminFetch";

// Shield Icon
const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

// Check Icon
const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
    </svg>
);

export default function TwoFactorSetupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [showSetup, setShowSetup] = useState(false);

    useEffect(() => {
        checkStatus();
    }, []);

    // Check status
    const checkStatus = async () => {
        try {
            const res = await adminFetch("/api/admin/profile");
            const data = await res.json();
            if (res.ok) {
                setIs2FAEnabled(data.twoFactorEnabled || false);
            }
        } catch (error) {
            console.error("Error checking 2FA status:", error);
        }
    };

    // Generate QR Code
    const generateQRCode = async () => {
        try {
            setLoading(true);
            const res = await adminFetch("/api/admin/2fa/setup");
            const data = await res.json();

            if (res.ok) {
                setQrCode(data.qrCode);
                setSecret(data.secret);
                setShowSetup(true);
            } else {
                alert(data.error || "Failed to generate QR code");
            }
        } catch (error) {
            console.error("Error generating QR code:", error);
            alert("Failed to generate QR code");
        } finally {
            setLoading(false);
        }
    };

    // Verify 2FA
    const verify2FA = async () => {
        if (verificationCode.length !== 6) {
            alert("Please enter a 6-digit code");
            return;
        }

        try {
            setLoading(true);
            const res = await adminFetch("/api/admin/2fa/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: verificationCode })
            });

            const data = await res.json();

            if (res.ok) {
                alert("2FA enabled successfully!");
                setIs2FAEnabled(true);
                setShowSetup(false);
                setVerificationCode("");
            } else {
                alert(data.error || "Invalid code");
            }
        } catch (error) {
            console.error("Error verifying code:", error);
            alert("Verification failed");
        } finally {
            setLoading(false);
        }
    };

    // Disable 2FA
    const disable2FA = async () => {
        if (!confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) {
            return;
        }

        try {
            setLoading(true);
            const res = await adminFetch("/api/admin/2fa/setup", {
                method: "DELETE"
            });

            const data = await res.json();

            if (res.ok) {
                alert("2FA disabled successfully");
                setIs2FAEnabled(false);
                setShowSetup(false);
            } else {
                alert(data.error || "Failed to disable 2FA");
            }
        } catch (error) {
            console.error("Error disabling 2FA:", error);
            alert("Failed to disable 2FA");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminDashboardWrapper>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10">
                            <ShieldIcon />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Two-Factor Authentication</h1>
                    </div>
                    <p className="text-white/50 ml-15">Add an extra layer of security to your admin account</p>
                </div>

                {/* Status Card */}
                <div className="bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0d0d0d] rounded-2xl border border-white/10 p-8 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-2">Current Status</h3>
                            <p className="text-white/50">
                                {is2FAEnabled
                                    ? "Two-factor authentication is currently enabled"
                                    : "Two-factor authentication is currently disabled"}
                            </p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg ${is2FAEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} font-semibold`}>
                            {is2FAEnabled ? "Enabled" : "Disabled"}
                        </div>
                    </div>

                    {!is2FAEnabled && !showSetup && (
                        <button
                            onClick={generateQRCode}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-white/90 rounded-xl text-black font-semibold transition-all disabled:opacity-50"
                        >
                            <ShieldIcon />
                            {loading ? "Loading..." : "Enable Two-Factor Authentication"}
                        </button>
                    )}

                    {is2FAEnabled && (
                        <button
                            onClick={disable2FA}
                            disabled={loading}
                            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-semibold transition-all disabled:opacity-50"
                        >
                            {loading ? "Disabling..." : "Disable 2FA"}
                        </button>
                    )}
                </div>

                {/* Setup Card */}
                {showSetup && (
                    <div className="bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0d0d0d] rounded-2xl border border-white/10 p-8">
                        <h3 className="text-2xl font-semibold text-white mb-6">Setup Google Authenticator</h3>

                        {/* Step 1 */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                                    1
                                </div>
                                <h4 className="text-lg font-semibold text-white">Download Google Authenticator</h4>
                            </div>
                            <p className="text-white/70 ml-11 mb-3">
                                Install Google Authenticator on your mobile device from:
                            </p>
                            <div className="ml-11 space-y-2">
                                <a
                                    href="https://apps.apple.com/app/google-authenticator/id388497605"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    → iOS App Store
                                </a>
                                <a
                                    href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    → Google Play Store
                                </a>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                                    2
                                </div>
                                <h4 className="text-lg font-semibold text-white">Scan QR Code</h4>
                            </div>
                            <div className="ml-11">
                                <p className="text-white/70 mb-4">
                                    Open the app and scan this QR code:
                                </p>
                                {qrCode && (
                                    <div className="inline-block p-4 bg-white rounded-xl">
                                        <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                                    </div>
                                )}
                                <p className="text-white/50 mt-4 text-sm">
                                    Or manually enter this secret key: <br />
                                    <code className="text-white bg-white/10 px-3 py-1 rounded mt-2 inline-block font-mono">
                                        {secret}
                                    </code>
                                </p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                                    3
                                </div>
                                <h4 className="text-lg font-semibold text-white">Enter Verification Code</h4>
                            </div>
                            <div className="ml-11">
                                <p className="text-white/70 mb-4">
                                    Enter the 6-digit code from your authenticator app:
                                </p>
                                <div className="flex gap-4 items-center">
                                    <input
                                        type="text"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        className="flex-1 max-w-xs text-center tracking-[1em] font-mono text-2xl px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all"
                                        placeholder="000000"
                                        maxLength={6}
                                    />
                                    <button
                                        onClick={verify2FA}
                                        disabled={loading || verificationCode.length !== 6}
                                        className="px-8 py-4 bg-white hover:bg-white/90 rounded-xl text-black font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <CheckIcon />
                                        {loading ? "Verifying..." : "Verify & Enable"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Cancel Button */}
                        <div className="border-t border-white/10 pt-6">
                            <button
                                onClick={() => setShowSetup(false)}
                                className="text-white/50 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminDashboardWrapper>
    );
}
