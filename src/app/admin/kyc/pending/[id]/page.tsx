// /app/admin/kyc/pending/[id]/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileText } from "lucide-react";

import AdminDashboardWrapper, { useAdmin } from "../../../components/AdminDashboardWrapper";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin/adminFetch";
import { getAccessToken } from "@/lib/auth/tokenStore";
import { getBusinessTypeLabel } from "@/lib/business-types";
import { KYC_TAB_ORDER, KYC_TAB_LABELS, getVerificationLabel } from "@/lib/admin/verification-constants";
import { toast } from "sonner";
import { encodeId } from "@/lib/admin/encodeId";
import { format } from "date-fns";

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg mx-4 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-white/[0.1] rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
                    <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const InnerZoomImage = ({ src, alt, className = "" }: { src: string; alt: string; className?: string }) => {
    const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({
        transformOrigin: "center center",
        transform: "scale(1)"
    });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        // Calculate coordinates relative to the image container
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;

        setZoomStyle({
            transformOrigin: `${x}% ${y}%`,
            transform: "scale(2.5)", // Premium zoom level
        });
    };

    const handleMouseLeave = () => {
        setZoomStyle({
            transformOrigin: "center center",
            transform: "scale(1)",
        });
    };

    return (
        <div
            className={`relative overflow-hidden cursor-zoom-in group ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover transition-transform duration-300 ease-out"
                style={zoomStyle}
            />
            {/* Subtle overlay to indicate zoom area */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};

function KYCDetailsContent() {
    const params = useParams();
    // const { hasPermission } = useAdmin();
    const router = useRouter();
    const { id } = params;

    const [modalType, setModalType] = useState<"approve" | "reject" | "send_approval" | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [kycData, setKycData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isLivenessPlaying, setIsLivenessPlaying] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; mimeType: string } | null>(null);
    const livenessVideoRef = useRef<HTMLVideoElement>(null);

    // Rejection history state
    const [allRejections, setAllRejections] = useState<any[]>([]);
    const [showRejectionTimeline, setShowRejectionTimeline] = useState(true);

    const toggleLivenessVideo = () => {
        if (livenessVideoRef.current) {
            if (isLivenessPlaying) {
                livenessVideoRef.current.pause();
            } else {
                livenessVideoRef.current.play();
            }
        }
    };

    const openModal = (type: "approve" | "reject" | "send_approval") => { setModalType(type); setRejectReason(""); };
    const closeModal = () => { setModalType(null); setRejectReason(""); };

    const { hasPermission, userData: adminData } = useAdmin();

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchKycData = async () => {
            try {
                const res = await adminFetch(`/api/admin/kyc/pending/${id}`);
                const data = await res.json();
                if (data.success) {
                    setKycData(data.data);
                    // console.log("Frontend KYC Data Loaded:", data.data);

                    const availableTabs = ["digilocker", "gst", "cin", "pan", "IdentityVerified", "document"].filter((type) => {
                        if (type === "document" || type === "IdentityVerified") {
                            return data.data.internationalVerified == 1 || data.data.internationalVerified === true;
                        }
                        return data.data.documents?.some(
                            (doc: any) => doc.verificationType?.toLowerCase() === type.toLowerCase()
                        ) ?? false;
                    });

                    if (availableTabs.length > 0) {
                        setActiveTab(availableTabs[0]);
                    }

                    // Fetch rejection history for this user after main data loads
                    if (data.data?.userId) {
                        fetchRejectionHistory(data.data.userId);
                    }
                } else {
                    setError(data.error || "Failed to fetch data");
                }
            } catch (err) {
                setError("An error occurred");
            } finally {
                setLoading(false);
            }
        };

        // const fetchRejectionHistory = async (userId: number) => {
        //     try {
        //         // We fetch rejection history by looking up any rejected record for this user.
        //         // The rejected API returns allRejections for the user when passed a valid rejection id.
        //         // Instead we call a user-based lookup via the pending route data.
        //         const res = await adminFetch(`/api/admin/kyc/rejected/user/${userId}`);
        //         if (res.ok) {
        //             const data = await res.json();
        //             if (data.success && data.allRejections) {
        //                 setAllRejections(data.allRejections);
        //             }
        //         }
        //     } catch {
        //         // silently fail — rejection history is optional context
        //     }
        // };
        const fetchRejectionHistory = async (userId: number) => {
            try {
                const res = await adminFetch(`/api/admin/kyc/rejected/user/${encodeId(userId)}`);

                // 404 = no rejection history for this user, that's fine
                if (res.status === 404) {
                    setAllRejections([]);
                    return;
                }

                if (!res.ok) return; // other errors: silently skip

                const data = await res.json();
                if (data.success && data.allRejections) {
                    setAllRejections(data.allRejections);
                }
            } catch {
                // silently fail — rejection history is optional context
            }
        };

        if (id) fetchKycData();
    }, [id]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAction = async (action: "approve" | "reject" | "send_approval") => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const actionText = action === "approve" ? "Approving" : action === "send_approval" ? "Sending for Approval" : "Rejecting";
        const toastId = toast.loading(`${actionText} KYC...`);

        try {
            // 1. Perform KYC Action (Approve/Reject/Send Approval)
            const res = await adminFetch(`/api/admin/kyc/pending`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: id,
                    action: action,
                    reason: rejectReason,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Action failed");
            }

            // 2. If Approved, Create WHMCS Client
            if (action === "approve") {
                toast.loading("Creating WHMCS client...", { id: toastId });
                try {
                    const whmcsRes = await adminFetch("/api/admin/whmcs/create-client", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: kycData.userId,
                            firstName: kycData.firstName,
                            lastName: kycData.lastName,
                            email: kycData.email,
                            // phoneNumber: `${kycData.countryCode || ""}${kycData.phone}`,
                            phoneNumber: `${kycData.countryCode ?? ""}${kycData.phone ?? ""}`,
                            address1: kycData.streetAddress || "",
                            city: kycData.city || "",
                            state: kycData.state || "",
                            postcode: kycData.postalCode || "",
                            country: kycData.country || "IN",
                            companyName: kycData.companyName || "",
                            gstNumber: kycData.gstNumberDoc || "",
                            currency: kycData.currency || "INR",
                            internationalVerified: kycData.internationalVerified,
                        }),
                    });
                    // console.log("WHMCS Response:", whmcsRes);
                    // debugger;
                    const whmcsData = await whmcsRes.json();

                    if (!whmcsData.success) {
                        console.error("WHMCS Creation Failed:", whmcsData.error);
                        toast.warning(`KYC Approved, but WHMCS client creation failed: ${whmcsData.error || "Unknown error"}`, { id: toastId, duration: 5000 });
                    } else {
                        toast.success("KYC Approved & WHMCS Client Created Successfully!", { id: toastId });
                    }
                } catch (whmcsError) {
                    console.error("WHMCS Error:", whmcsError);
                    toast.error("KYC Approved, but failed to connect to WHMCS system.", { id: toastId });
                }
            } else if (action === "send_approval") {
                toast.success("KYC sent for approval successfully", { id: toastId });
            } else {
                toast.success("KYC Rejected successfully", { id: toastId });
            }

            // Success - Redirect after a short delay to allow toast to be seen
            closeModal();
            setTimeout(() => {
                router.push("/admin/kyc/pending");
            }, 1500);

        } catch (error: any) {
            console.error("Error performing action:", error);
            toast.error(error.message || "An error occurred", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper for badges
    const VerificationBadge = ({ verified, label }: { verified: boolean, label: string }) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${verified ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            {verified ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
            )}
            {label}
        </span>
    );

    // Add this state at top of component
    const [activeTab, setActiveTab] = useState("digilocker");

    const tabOrder = KYC_TAB_ORDER;
    const tabLabels = KYC_TAB_LABELS;

    const formatAddress = (address: string) => {
        if (!address) return <p className="text-white/90 font-medium text-sm">N/A</p>;
        const parts = address.split(", ");
        if (parts.length < 2) return <p className="text-white/90 font-medium text-sm">{address}</p>;
        const line3 = [parts[2], parts[3], parts[4]].filter(Boolean).join(", ");
        const line4Part1 = [parts[5], parts[6], parts[7]].filter(Boolean).join(", ");
        const line4 = parts[8] ? `${line4Part1} - ${parts[8]}` : line4Part1;
        return (
            <div className="text-white/90 font-medium text-sm leading-relaxed space-y-0.5">
                {parts[0] && <p>{parts[0]}</p>}
                {parts[1] && <p>{parts[1]}</p>}
                {line3 && <p>{line3}</p>}
                {line4 && <p>{line4}</p>}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">

                <div className="relative flex items-center justify-center">

                    {/* Spinner Ring */}
                    <div className="h-16 w-16 rounded-full border-2 border-white/10"></div>

                    <div className="absolute h-16 w-16 rounded-full border-2 border-transparent border-t-white animate-spin"></div>

                    {/* Document Icon */}
                    <div className="absolute">
                        <FileText className="h-7 w-7 text-white" />
                    </div>

                </div>

            </div>
        );
    }

    if (error || !kycData) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Record Not Found</h2>
                    <p className="text-white/50 mb-6">{error || "The requested KYC record could not be found."}</p>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white transition-colors border border-white/[0.08]"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-6">
                {/* Header with Back Button */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-colors border border-white/[0.08]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <h1 className="text-2xl font-bold text-white">KYC Verification Details</h1>
                </div>
                {/* Tabs */}
                {/* <div className="flex gap-2 border-b border-white/[0.08] mb-6">
                    {["digilocker", "gst", "cin", "pan"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === tab
                                ? "bg-white/[0.08] text-white"
                                : "text-white/60 hover:text-white hover:bg-white/[0.05]"
                                }`}
                        >
                            {tab.toUpperCase()}
                        </button>
                    ))}
                </div> */}
                {kycData.accountType === "enterprise" && (
                    <div className="flex bg-[#121212] p-1.5 rounded-lg border border-white/[0.08] mb-8 w-fit">
                        {tabOrder
                            // .filter((type) =>
                            //     kycData.documents?.some(
                            //         (doc: any) => doc.verificationType?.toLowerCase() === type
                            //     )
                            // )
                            .filter((type) => {
                                if (type === "document" || type === "IdentityVerified") {
                                    return kycData.internationalVerified == 1 || kycData.internationalVerified === true;
                                }

                                return kycData.documents?.some(
                                    (doc: any) => doc.verificationType?.toLowerCase() === type.toLowerCase()
                                ) ?? false;
                            })
                            .map((type) => {
                                const isActive = activeTab === type;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setActiveTab(type)}
                                        className={`relative px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-300 flex items-center gap-2.5 group
                                            ${isActive
                                                ? "bg-white text-black shadow-[0_4px_12px_rgba(255,255,255,0.1)]"
                                                : "text-white/40 hover:text-white/90 hover:bg-white/[0.03]"
                                            }`}>
                                        <div className={`transition-colors duration-300 ${isActive ? "text-black" : "text-white/30 group-hover:text-white/60"}`}>
                                            {type === "digilocker" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            )}
                                            {type === "gst" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                            )}
                                            {type === "cin" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                            )}
                                            {type === "pan" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10" /><path d="M7 12h10" /><path d="M7 16h10" /></svg>
                                            )}
                                            {type === "IdentityVerified" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
                                            )}
                                            {type === "document" && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                                            )}
                                        </div>
                                        {tabLabels[type]}
                                        {isActive && (
                                            <div className="absolute -bottom-[22px] left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full blur-[2px] opacity-40" />
                                        )}
                                    </button>
                                );
                            })}
                    </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
                    {/* Left Column: User Profile */}
                    <div className="space-y-6">
                        {/* Documents Section */}
                        {/* {kycData.documents && kycData.documents.length > 0 && (
                            <div className="space-y-6">
                                {kycData.documents.map((doc: any, index: number) => { */}
                        {(kycData?.internationalVerified == 1 || kycData?.internationalVerified === true) && (kycData.accountType !== "enterprise" || activeTab === "IdentityVerified" || activeTab === "document") ? (
                            <>
                                {(kycData.accountType !== "enterprise" || activeTab === "IdentityVerified") && (
                                    !kycData.diditSession ? (
                                        <div className="bg-[#141414] border border-white/[0.08] rounded-2xl p-12 text-center space-y-4">
                                            <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto text-white/20">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">Identity Verification Not Started</p>
                                                <p className="text-white/40 text-sm mt-1">The user has not yet completed the international identity verification process.</p>
                                            </div>
                                        </div>
                                    ) : (() => {
                                        const session = kycData.diditDecision;
                                        if (!session) return (
                                            <div className="bg-[#141414] border border-white/[0.08] rounded-2xl p-8 text-center italic text-white/40">
                                                Loading deep verification data...
                                            </div>
                                        );

                                        // console.log("=== API DEBUG: DIDIT DATA ===");
                                        // console.log("Session Data:", JSON.stringify(kycData.diditDecision, null, 2));
                                        // console.log("===============================");

                                        const idData = session.id_verifications?.[0];
                                        const liveData = session.liveness_checks?.[0];
                                        const frontScore = idData?.front_image_quality_score;
                                        const backScore = idData?.back_image_quality_score;

                                        return (
                                            <div className="space-y-6">
                                                {/* Main Status & Header */}
                                                <div className="bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
                                                    <div className="bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-4 border-b border-white/[0.08] flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-semibold text-base">International ID Verification</p>
                                                                {/* <p className="text-white/30 text-xs tracking-wider font-semibold mt-1">Verified via DIDIT.ME</p> */}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${kycData.diditSession.status === "Approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                                                kycData.diditSession.status === "Declined" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                                                    kycData.diditSession.status === "Pending" ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                                                                        kycData.diditSession.status === "Not Started" ? "bg-white/5 border-white/10 text-white/50" :
                                                                            "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                                                }`}>
                                                                <div className={`w-2 h-2 rounded-full ${kycData.diditSession.status === "Approved" ? "bg-emerald-500" :
                                                                    kycData.diditSession.status === "Declined" ? "bg-red-500" :
                                                                        kycData.diditSession.status === "Pending" ? "bg-blue-500" :
                                                                            kycData.diditSession.status === "Not Started" ? "bg-white/30" :
                                                                                "bg-amber-500"
                                                                    }`}></div>
                                                                <span className="text-xs font-bold tracking-wide capitalize">
                                                                    {kycData.diditSession.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-6 space-y-8">
                                                        {/* Document Information Grid */}
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex items-center gap-2">
                                                                {/* <div className="w-2 h-2 rounded-full bg-emerald-500"></div> */}
                                                                <p className="text-xs text-white/40 tracking-wider font-semibold">ID Verification</p>
                                                            </div>
                                                            {/* <span className="text-xs font-bold text-emerald-400">{idData?.status || "Approved"}</span> */}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                                            <div>
                                                                <p className="text-xs text-white/30 tracking-wider font-semibold mb-1">Document Type</p>
                                                                <p className="text-white/90 text-sm font-medium tracking-wide">{idData?.document_type || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-white/30 tracking-wider font-semibold mb-1">Document Number</p>
                                                                <p className="text-white/90 text-sm font-medium tracking-wide">{idData?.document_number || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-white/30 tracking-wider font-semibold mb-1">Issuing State</p>
                                                                <p className="text-white/90 text-sm font-medium tracking-wide">{idData?.issuing_state_name || session.issuing_state_name || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-white/30 tracking-wider font-semibold mb-1">Date of Birth</p>
                                                                <p className="text-white/90 text-sm font-medium tracking-wide">{idData?.date_of_birth || session.date_of_birth || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-white/30 tracking-wider font-semibold mb-1">As per document</p>
                                                                <p className="text-white/90 text-sm font-medium tracking-wide">{kycData?.representativeName || "N/A"}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-white/30 tracking-wider font-semibold mb-1">Gender</p>
                                                                <p className="text-white/90 text-sm font-medium tracking-wide">
                                                                    {activeTab === "IdentityVerified" && (() => {
                                                                        const g = (idData?.gender || session.gender || "").toString().toUpperCase();
                                                                        if (g === 'M' || g === 'MALE') return "Male";
                                                                        if (g === 'F' || g === 'FEMALE') return "Female";
                                                                        return idData?.gender || session.gender || "N/A";
                                                                    })()}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Images & Quality Scores Section */}
                                                        <div className="space-y-6">
                                                            <div className="grid grid-cols-2 gap-6">
                                                                {/* Front Image */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-xs text-white/40 tracking-wider font-semibold">Front Document</p>
                                                                        {frontScore && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/[0.05] text-white/60">
                                                                                Resolution: {frontScore.resolution_score}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="aspect-[1.58/1] rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40 relative">
                                                                        {idData?.front_image ? (
                                                                            <InnerZoomImage src={idData.front_image} alt="Document Front" className="w-full h-full" />
                                                                        ) : <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">No image</div>}
                                                                        {/* {frontScore?.is_document_fully_visible && (
                                                                            <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 pointer-events-none">FULLY VISIBLE</div>
                                                                        )} */}
                                                                    </div>
                                                                </div>

                                                                {/* Back Image */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-xs text-white/40 tracking-wider font-semibold">Back Document</p>
                                                                        {backScore && (
                                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/[0.05] text-white/60">
                                                                                Resolution: {backScore.resolution_score}%
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="aspect-[1.58/1] rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40 relative">
                                                                        {idData?.back_image ? (
                                                                            <InnerZoomImage src={idData.back_image} alt="Document Back" className="w-full h-full" />
                                                                        ) : <div className="w-full h-full flex items-center justify-center text-white/10 italic text-xs">No image</div>}
                                                                        {/* {backScore?.is_document_fully_visible && (
                                                                            <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 pointer-events-none">FULLY VISIBLE</div>
                                                                        )} */}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Liveness Section */}
                                                        <div className="pt-6 border-t border-white/[0.08]">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-2">
                                                                    {/* <div className="w-2 h-2 rounded-full bg-emerald-500"></div> */}
                                                                    <p className="text-xs text-white/40 tracking-wider font-semibold">Liveness Check</p>
                                                                </div>
                                                                <span className="text-xs font-bold text-emerald-400">{liveData?.status || "Approved"}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-6">
                                                                <div className="space-y-3">
                                                                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.08] bg-black/40 relative group shadow-2xl">
                                                                        {liveData?.reference_image ? (
                                                                            <img src={liveData.reference_image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Liveness Reference" />
                                                                        ) : <div className="w-full h-full flex items-center justify-center text-white/5 italic text-[10px]">No image</div>}
                                                                        {/* <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                                                                            <p className="text-[10px] text-white/70 font-bold tracking-widest text-center">Face Reference</p>
                                                                        </div> */}
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.08] bg-black relative group shadow-2xl">
                                                                        {liveData?.video_url ? (
                                                                            <div className="relative w-full h-full group/video">
                                                                                <video
                                                                                    ref={livenessVideoRef}
                                                                                    src={liveData.video_url}
                                                                                    playsInline
                                                                                    className="w-full h-full object-cover"
                                                                                    onPlay={() => setIsLivenessPlaying(true)}
                                                                                    onPause={() => setIsLivenessPlaying(false)}
                                                                                    onClick={toggleLivenessVideo}
                                                                                />
                                                                                {/* Custom Play Control Overlay */}
                                                                                <div
                                                                                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 pointer-events-none ${isLivenessPlaying ? "bg-transparent opacity-0 group-hover/video:opacity-100 group-hover/video:bg-black/20" : "bg-black/30 opacity-100"}`}
                                                                                >
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); toggleLivenessVideo(); }}
                                                                                        className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white pointer-events-auto transform transition-transform active:scale-90 hover:scale-110 shadow-2xl"
                                                                                    >
                                                                                        {isLivenessPlaying ? (
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                                                                        ) : (
                                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="h-full flex items-center justify-center italic text-white/20 text-xs">
                                                                                Video unavailable
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-2xl" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Quick Preview Gallery */}
                                                        {/* <div className="pt-6 border-t border-white/[0.08] space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-[10px] text-white/30 tracking-[0.2em] font-bold uppercase">Evidence Preview Bar</p>
                                                                <div className="h-px flex-1 mx-4 bg-gradient-to-r from-white/5 to-transparent" />
                                                            </div>
                                                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                                                {idData?.front_image && (
                                                                    <div className="flex-shrink-0 group">
                                                                        <div className="w-40 aspect-[1.58/1] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-xl transition-all group-hover:border-white/20">
                                                                            <InnerZoomImage src={idData.front_image} alt="Front Preview" className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <p className="text-[9px] text-center text-white/20 mt-2 font-bold uppercase tracking-widest group-hover:text-white/40 transition-colors">Front ID</p>
                                                                    </div>
                                                                )}
                                                                {idData?.back_image && (
                                                                    <div className="flex-shrink-0 group">
                                                                        <div className="w-40 aspect-[1.58/1] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-xl transition-all group-hover:border-white/20">
                                                                            <InnerZoomImage src={idData.back_image} alt="Back Preview" className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <p className="text-[9px] text-center text-white/20 mt-2 font-bold uppercase tracking-widest group-hover:text-white/40 transition-colors">Back ID</p>
                                                                    </div>
                                                                )}
                                                                {liveData?.reference_image && (
                                                                    <div className="flex-shrink-0 group">
                                                                        <div className="w-40 aspect-[1.58/1] rounded-xl overflow-hidden border border-white/10 bg-black/40 shadow-xl transition-all group-hover:border-white/20">
                                                                            <InnerZoomImage src={liveData.reference_image} alt="Selfie Preview" className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <p className="text-[9px] text-center text-white/20 mt-2 font-bold uppercase tracking-widest group-hover:text-white/40 transition-colors">Liveness</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div> */}

                                                        {/* Audit Metadata */}
                                                        <div className="pt-6 border-t border-white/[0.05] flex items-center justify-between text-xs text-white/20 font-medium">
                                                            <div className="flex items-center gap-1">
                                                                <p className="text-xs font-semibold text-white/40 tracking-wider">Created At:</p> <p className="text-white/90">{new Date(session.created_at).toLocaleString()}</p>
                                                                {session.verification_date && <p>Verified: <span className="text-white/40">{new Date(session.verification_date).toLocaleString()}</span></p>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()
                                )}

                                {(kycData.accountType !== "enterprise" || activeTab === "document") && (
                                    !kycData.businessDocuments || kycData.businessDocuments.length === 0 ? (
                                        kycData.accountType === "enterprise" && (
                                            <div className="bg-[#141414] border border-white/[0.08] rounded-2xl p-12 text-center space-y-4">
                                                <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto text-white/20">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold">No Business Documents Found</p>
                                                    <p className="text-white/40 text-sm mt-1">The user has not uploaded any business verification documents for this profile.</p>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        <div className="space-y-6">
                                            {kycData.businessDocuments.map((doc: any, index: number) => (
                                                <div key={`biz-${index}`} className="bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden">
                                                    <div className="bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-4 border-b border-white/[0.08] flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-semibold text-base">
                                                                    International Document Verification
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 space-y-5">

                                                        {/* Metadata Fields */}
                                                        <table className="w-full text-sm">
                                                            <tbody className="divide-y divide-white/[0.04]">
                                                                {[
                                                                    // { label: "Type", value: doc.documentType?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) || "—" },
                                                                    // { label: "Label", value: doc.label || "—" },
                                                                    { label: "File Name", value: doc.originalName || "—" },
                                                                    { label: "Format", value: doc.mimeType || "—" },
                                                                    { label: "Size", value: doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : "—" },
                                                                    { label: "Uploaded", value: new Date(doc.uploadedAt).toLocaleString() },
                                                                ].map(({ label, value }) => (
                                                                    <tr key={label} className="group/row">
                                                                        <td className="py-2.5 pr-6 w-28 align-top">
                                                                            <span className="text-xs text-white/30 tracking-wider font-semibold mb-1">{label}</span>
                                                                        </td>
                                                                        <td className="py-2.5 align-top">
                                                                            <span className="text-sm text-white/70 font-medium break-all">{value}</span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>

                                                        {/* Action Bar */}
                                                        <div className="pt-4 border-t border-white/[0.06] flex items-center gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    const token = getAccessToken();
                                                                    setPreviewDoc({
                                                                        url: `/api/admin/document?path=${encodeURIComponent(doc.storagePath)}${token ? `&token=${encodeURIComponent(token)}` : ""}`,
                                                                        name: doc.originalName || "Document",
                                                                        mimeType: doc.mimeType || "",
                                                                    });
                                                                }}
                                                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/60 text-xs font-bold tracking-widest hover:bg-white/[0.10] hover:border-white/[0.2] hover:text-white transition-all duration-200 group"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                                                Preview
                                                            </button>
                                                            <a
                                                                href={`/api/admin/document?path=${encodeURIComponent(doc.storagePath)}${getAccessToken() ? `&token=${encodeURIComponent(getAccessToken() || "")}` : ""}&download=1`}
                                                                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-xs font-bold tracking-widest hover:bg-white/[0.08] hover:border-white/[0.16] hover:text-white/70 transition-all duration-200 group"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-y-px transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                                                Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                )}
                            </>
                        ) : (
                            <>
                                {kycData.documents && kycData.documents.length > 0 && (
                                    <div className="space-y-6">
                                        {[...kycData.documents]
                                            .sort((a: any, b: any) => {
                                                const aIndex = tabOrder.indexOf(a.verificationType?.toLowerCase());
                                                const bIndex = tabOrder.indexOf(b.verificationType?.toLowerCase());

                                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                                if (aIndex !== -1) return -1;
                                                if (bIndex !== -1) return 1;
                                                return 0;
                                            })
                                            .filter((doc: any) =>
                                                kycData.accountType === "enterprise"
                                                    ? doc.verificationType?.toLowerCase() === activeTab
                                                    : true
                                            )
                                            .map((doc: any, index: number) => {
                                                // Extract photo from extractedData
                                                let photoSrc = null;
                                                // const extractedData = doc.extractedData || {};
                                                const extractedData: Record<string, any> = doc.extractedData || {};

                                                // Find photo field
                                                Object.entries(extractedData).forEach(([key, value]) => {
                                                    if ((key.toLowerCase().includes('photo') || key.toLowerCase().includes('image')) && value) {
                                                        const strValue = String(value);
                                                        if (strValue.startsWith('data:image') || strValue.startsWith('http')) {
                                                            photoSrc = strValue;
                                                        } else if (strValue.length > 100) {
                                                            photoSrc = `data:image/jpeg;base64,${strValue}`;
                                                        }
                                                    }
                                                });

                                                return (
                                                    <div key={index} className="bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden">
                                                        {/* Document Header */}
                                                        <div className="bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-4 border-b border-white/[0.08] flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                                                                </div>
                                                                <div>
                                                                    {/* <p className="text-white font-semibold text-base">
                                                                         {doc.verificationType === "digilocker"
                                                                         ? "DigiLocker verified e-Aadhaar"
                                                                         : doc.verificationType}
                                                                         </p> */}
                                                                    <p className="text-white font-semibold text-base">
                                                                        {getVerificationLabel(doc.verificationType)}
                                                                    </p>
                                                                    {/* <p className="text-white/40 text-xs">Verification Document</p> */}
                                                                </div>
                                                            </div>
                                                            {/* <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${doc.verificationStatus === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                                doc.verificationStatus === 'Declined' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                                    'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                                }`}>
                                                                <div className={`w-1.5 h-1.5 rounded-full ${doc.verificationStatus === 'Approved' ? 'bg-emerald-500' :
                                                                    doc.verificationStatus === 'Declined' ? 'bg-red-500' :
                                                                        'bg-amber-500'
                                                                    }`}></div>
                                                                <span className="text-xs font-bold tracking-widest">
                                                                    {doc.verificationStatus === 'Approved' ? 'Approved' : doc.verificationStatus === 'Declined' ? 'Declined' : 'In Review'}
                                                                </span>
                                                            </div> */}
                                                            <div className="flex items-center gap-2">
                                                                <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${doc.verificationStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                                    doc.verificationStatus === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                                                        'bg-amber-500/10 border-amber-500/20 text-amber-500'
                                                                    }`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${doc.verificationStatus === 'success' ? 'bg-emerald-500' :
                                                                        doc.verificationStatus === 'failed' ? 'bg-red-500' :
                                                                            'bg-amber-500'
                                                                        }`}></div>
                                                                    <span className="text-xs font-bold tracking-wide capitalize">
                                                                        {doc.verificationStatus || 'Pending'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Document Content */}
                                                        <div className="p-6 space-y-8">
                                                            {/* Document Number */}
                                                            {doc.documentNumber && (
                                                                <div className="mb-6 p-4 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                                                                    <p className="text-xs text-white/40 tracking-wider font-semibold mb-1">Document Number</p>
                                                                    <p className="text-white font-mono text-lg tracking-widest">{doc.documentNumber}</p>
                                                                </div>
                                                            )}

                                                            {/* Main Data Table */}
                                                            {Object.keys(extractedData).length > 0 && (
                                                                <div className="space-y-6">
                                                                    <div className={`grid grid-cols-1 gap-6 ${doc.verificationType === 'digilocker' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
                                                                        {/* Left: Data Fields */}
                                                                        <div className={`space-y-3 ${doc.verificationType === 'digilocker' ? 'lg:col-span-2' : 'lg:col-span-full'}`}>
                                                                            {Object.entries(extractedData).map(([key, value]) => {
                                                                                if (value === null || value === undefined || value === "") return null;

                                                                                // Skip arrays and nested objects — renders as [object Object]
                                                                                if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return null;

                                                                                const lowerKey = key.toLowerCase();

                                                                                // Filter out unwanted fields and address fields
                                                                                if (
                                                                                    lowerKey.includes('photo') ||
                                                                                    lowerKey.includes('image') ||
                                                                                    lowerKey.includes('xml') ||
                                                                                    lowerKey.includes('reference') ||
                                                                                    lowerKey.includes('split_address') ||
                                                                                    lowerKey.includes('verification_id') ||
                                                                                    lowerKey.includes('address') ||
                                                                                    lowerKey.includes('care_of') ||
                                                                                    lowerKey.includes('year_of_birth') ||

                                                                                    // GST-specific noisy fields
                                                                                    (doc.verificationType === 'gst' && (
                                                                                        lowerKey.includes('additional_address_array') ||
                                                                                        lowerKey.includes('nature_of_business_activities') ||
                                                                                        lowerKey.includes('reference_id') ||

                                                                                        lowerKey.includes('message') ||
                                                                                        lowerKey.includes('valid') ||
                                                                                        lowerKey.includes('gst_in_status')
                                                                                    ))
                                                                                ) return null;

                                                                                const strValue = String(value);
                                                                                const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();

                                                                                return (
                                                                                    <div key={key} className="grid grid-cols-3 border-b border-white/[0.03] last:border-0 pb-3.5 group/field">
                                                                                        <div className="col-span-1">
                                                                                            <p className="text-xs font-semibold text-white/40 tracking-wider capitalize">{label}</p>
                                                                                        </div>
                                                                                        <div className="col-span-2">
                                                                                            <p className="text-sm text-white/80 font-semibold break-all tracking-tight group-hover/field:text-white transition-colors">{typeof value === 'object' ? JSON.stringify(value) : strValue}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Right: Photo */}
                                                                        {photoSrc && (
                                                                            <div className="lg:col-span-1 flex items-start justify-center">
                                                                                <div className="relative w-[160px] h-[200px] rounded-lg overflow-hidden border-2 border-white/[0.1] bg-black/20 shadow-xl group">
                                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                    <img
                                                                                        src={photoSrc}
                                                                                        alt="Document Photo"
                                                                                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-1"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Full Width Address Section */}
                                                                    <div className="!mt-0">
                                                                        {Object.entries(extractedData)
                                                                            .sort(([keyA], [keyB]) => {
                                                                                // Sort Address first, then Care Of
                                                                                const a = keyA.toLowerCase();
                                                                                const b = keyB.toLowerCase();
                                                                                if (a.includes('address') && !b.includes('address')) return -1;
                                                                                if (!a.includes('address') && b.includes('address')) return 1;
                                                                                if (a.includes('care_of') && !b.includes('care_of')) return -1;
                                                                                if (!a.includes('care_of') && b.includes('care_of')) return 1;
                                                                                return 0;
                                                                            })
                                                                            .map(([key, value]) => {
                                                                                if (value === null || value === undefined || value === "") return null;

                                                                                const lowerKey = key.toLowerCase();

                                                                                // For address fields that come back as objects (e.g. GST principal_place_address),
                                                                                // extract the nested "address" string so it can still be rendered.
                                                                                let resolvedValue = value;
                                                                                if (
                                                                                    lowerKey.includes('address') &&
                                                                                    typeof value === 'object' &&
                                                                                    value !== null &&
                                                                                    !Array.isArray(value) &&
                                                                                    typeof (value as any).address === 'string'
                                                                                ) {
                                                                                    resolvedValue = (value as any).address;
                                                                                }

                                                                                // Skip remaining arrays and nested objects (e.g. additional_address_array)
                                                                                if (Array.isArray(resolvedValue) || (typeof resolvedValue === 'object' && resolvedValue !== null)) return null;

                                                                                // Only show address/care_of fields
                                                                                if (
                                                                                    !lowerKey.includes('address') &&
                                                                                    !lowerKey.includes('care_of')
                                                                                ) return null;

                                                                                // Skip split_address and additional_address_array
                                                                                if (lowerKey.includes('split_address') || lowerKey.includes('additional_address_array')) return null;

                                                                                const strValue = String(resolvedValue);
                                                                                const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();

                                                                                return (
                                                                                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 border-t pt-[12px] border-white/[0.05] pb-3">
                                                                                        <div className="md:col-span-1 lg:col-span-2">
                                                                                            <p className="text-xs text-white/40 tracking-wider font-semibold capitalize">{label}</p>
                                                                                        </div>
                                                                                        <div className="md:col-span-2 lg:col-span-7">
                                                                                            {key.toLowerCase().includes('address') ? (
                                                                                                (() => {
                                                                                                    const formatAddress = (address: string) => {
                                                                                                        const parts = address.split(", ");
                                                                                                        if (parts.length < 2) return <p>{address}</p>;

                                                                                                        const line3 = [parts[2], parts[3], parts[4]].filter(Boolean).join(", ");
                                                                                                        const line4Part1 = [parts[5], parts[6], parts[7]].filter(Boolean).join(", ");
                                                                                                        const line4 = parts[8] ? `${line4Part1} - ${parts[8]}` : line4Part1;

                                                                                                        return (
                                                                                                            <>
                                                                                                                {parts[0] && <p>{parts[0]}</p>}
                                                                                                                {parts[1] && <p>{parts[1]}</p>}
                                                                                                                {line3 && <p>{line3}</p>}
                                                                                                                {line4 && <p>{line4}</p>}
                                                                                                            </>
                                                                                                        );
                                                                                                    };
                                                                                                    return (
                                                                                                        <div className="text-white/90 font-medium text-sm leading-relaxed space-y-0.5">
                                                                                                            {formatAddress(strValue)}
                                                                                                        </div>
                                                                                                    );
                                                                                                })()
                                                                                            ) : (
                                                                                                <p className="text-sm text-white/90 font-medium break-all whitespace-pre-wrap leading-relaxed">{typeof value === 'object' ? JSON.stringify(value) : strValue}</p>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                    // <div key={key} className="grid grid-cols-3 border-t border-white/[0.03] pt-3 group/field">
                                                                                    //     <div className="col-span-1">
                                                                                    //         <p className="text-xs font-semibold text-white/40 tracking-wider capitalize">
                                                                                    //             {label}
                                                                                    //         </p>
                                                                                    //     </div>

                                                                                    //     <div className="col-span-2">
                                                                                    //         {key.toLowerCase().includes('address') ? (
                                                                                    //             (() => {
                                                                                    //                 const formatAddress = (address: string) => {
                                                                                    //                     const parts = address.split(", ");
                                                                                    //                     if (parts.length < 2) return <p>{address}</p>;

                                                                                    //                     const line3 = [parts[2], parts[3], parts[4]]
                                                                                    //                         .filter(Boolean)
                                                                                    //                         .join(", ");

                                                                                    //                     const line4Part1 = [parts[5], parts[6], parts[7]]
                                                                                    //                         .filter(Boolean)
                                                                                    //                         .join(", ");

                                                                                    //                     const line4 = parts[8]
                                                                                    //                         ? `${line4Part1} - ${parts[8]}`
                                                                                    //                         : line4Part1;

                                                                                    //                     return (
                                                                                    //                         <>
                                                                                    //                             {parts[0] && <p>{parts[0]}</p>}
                                                                                    //                             {parts[1] && <p>{parts[1]}</p>}
                                                                                    //                             {line3 && <p>{line3}</p>}
                                                                                    //                             {line4 && <p>{line4}</p>}
                                                                                    //                         </>
                                                                                    //                     );
                                                                                    //                 };

                                                                                    //                 return (
                                                                                    //                     <div className="text-white/90 text-sm font-medium leading-relaxed space-y-0.5">
                                                                                    //                         {formatAddress(strValue)}
                                                                                    //                     </div>
                                                                                    //                 );
                                                                                    //             })()
                                                                                    //         ) : (
                                                                                    //             <p className="text-sm text-white/80 font-semibold break-all tracking-tight group-hover/field:text-white transition-colors">
                                                                                    //                 {typeof value === "object"
                                                                                    //                     ? JSON.stringify(value)
                                                                                    //                     : strValue}
                                                                                    //             </p>
                                                                                    //         )}
                                                                                    //     </div>
                                                                                    // </div>
                                                                                );
                                                                            })}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Metadata Footer */}
                                                            <div className="pt-3 border-t border-white/[0.05] grid grid-cols-2 gap-4 text-xs">
                                                                <div className="inline-flex items-center gap-2 align-center">
                                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Verified At:</p>
                                                                    {doc.verifiedAt ? (
                                                                        <p className="text-white/90">
                                                                            {
                                                                                new Date(doc.verifiedAt).toLocaleString("en-GB", {
                                                                                    timeZone: "UTC",
                                                                                    day: "2-digit",
                                                                                    month: "short",
                                                                                    year: "numeric",
                                                                                    hour: "2-digit",
                                                                                    minute: "2-digit",
                                                                                    second: "2-digit",
                                                                                    hour12: true,
                                                                                }).replace("am", "AM").replace("pm", "PM")
                                                                            }
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-white/50">-</p>
                                                                    )}
                                                                </div>
                                                                {doc.verificationStatus === 'success' && (
                                                                    <div className="text-right">
                                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                                                            <span className="text-xs font-bold tracking-wide text-emerald-500">Verified</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}


                            </>
                        )}
                    </div>

                    {/* Right Column: Verification Info */}
                    <div className="space-y-6">
                        <div className="bg-[#141414] border border-white/[0.08] rounded-2xl overflow-hidden h-full">
                            <div className="bg-gradient-to-r from-white/[0.05] to-white/[0.02] p-4 border-b border-white/[0.08] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-base">Personal Information</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                                    <span className="text-yellow-500 text-xs font-bold tracking-wide">
                                        {kycData.status === "pending_superadmin" ? "Pending Approval" : kycData.status.charAt(0).toUpperCase() + kycData.status.slice(1)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-1">
                                    {kycData.accountType === 'individual' ? (
                                        <div className="md:col-span-2">
                                            <div className="grid grid-cols-1 md:grid-cols-1 relative overflow-hidden">
                                                <div className="absolute top-0 right-0">
                                                    <span className="px-4 py-1.5 rounded-full tracking-wider text-xs font-bold shadow-lg inline-flex items-center border border-white/[0.2] backdrop-blur-xl transition-all duration-500 hover:border-white/[0.4] bg-white/[0.05] text-white/90">
                                                        {kycData.accountType.replace(/_/g, " ").split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Account
                                                    </span>
                                                </div>

                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Full Name</p>
                                                    <p className="text-white/90 text-sm font-medium tracking-wide">{kycData.firstName} {kycData.lastName}</p>
                                                </div>

                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Email Address</p>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <p className="text-white/90 text-sm font-medium break-all">{kycData.email}</p>
                                                        {kycData.isEmailVerified ? (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500" title="Verified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500" title="Unverified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Mobile Number</p>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <p className="text-white/90 text-sm font-medium">{kycData.countryCode} {kycData.phone}</p>
                                                        {kycData.isPhoneVerified ? (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500" title="Verified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500" title="Unverified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-1 relative overflow-hidden">
                                                {/* Account Type Badge - top right */}
                                                <div className="absolute top-0 right-0">
                                                    <span className="px-4 py-1.5 rounded-full tracking-wider text-xs font-bold shadow-lg inline-flex items-center border border-white/[0.2] backdrop-blur-xl transition-all duration-500 hover:border-white/[0.4] bg-white/[0.05] text-white/90">
                                                        {kycData.accountType.replace(/_/g, " ").charAt(0).toUpperCase() + kycData.accountType.replace(/_/g, " ").slice(1)} Account
                                                    </span>
                                                </div>

                                                {/* Company Name */}
                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Company Name</p>
                                                    <p className="text-white/90 text-sm font-medium">{kycData.companyName || "N/A"}</p>
                                                </div>

                                                {/* Full Name */}
                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Full Name</p>
                                                    <p className="text-white/90 text-sm font-medium tracking-wide">{kycData.firstName} {kycData.lastName}</p>
                                                </div>

                                                {/* Business Type */}
                                                {!(kycData.internationalVerified == 1 && kycData.addressType === 0) && (
                                                    <div className="space-y-1 mb-4">
                                                        <p className="text-xs font-semibold text-white/40 tracking-wider">
                                                            Business Type
                                                        </p>
                                                        <p className="text-white/90 text-sm font-medium">
                                                            {getBusinessTypeLabel(kycData.businessType)}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* GST Number */}
                                                {/* <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">GST Number</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-white/90 text-sm font-mono font-medium">{kycData.gstNumber || "N/A"}</p>
                                                        {kycData.gstNumber && <VerificationBadge verified={kycData.gstVerified} label={kycData.gstVerified ? "Verified" : "Unverified"} />}
                                                    </div>
                                                </div> */}

                                                {/* CIN Number */}
                                                {/* <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">CIN / PAN Number</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-white/90 text-sm font-mono font-medium">{kycData.cinNumber || "N/A"}</p>
                                                        {kycData.cinNumber && <VerificationBadge verified={kycData.cinVerified} label={kycData.cinVerified ? "Verified" : "Unverified"} />}
                                                    </div>
                                                </div> */}

                                                {/* Email */}
                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Email Address</p>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-white/90 text-sm font-medium break-all">{kycData.email}</p>
                                                        {kycData.isEmailVerified ? (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500" title="Verified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500" title="Unverified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Phone */}
                                                <div className="space-y-1 mb-4">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Mobile Number</p>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-white/90 text-sm font-medium">{kycData.countryCode} {kycData.phone}</p>
                                                        {kycData.isPhoneVerified ? (
                                                            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500" title="Verified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500" title="Unverified">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="md:col-span-2 space-y-6 pt-4 border-t border-white/[0.08]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>
                                            <p className="text-white font-semibold text-base">Address Details</p>
                                        </div>
                                        {/* <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-white/40 tracking-wider">Street Address</p>
                                                <p className="text-white/90 font-medium text-sm">{kycData.streetAddress}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-white/40 tracking-wider">City</p>
                                                <p className="text-white/90 font-medium text-sm">{kycData.city}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-white/40 tracking-wider">State / Province</p>
                                                <p className="text-white/90 font-medium text-sm">{kycData.state}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-white/40 tracking-wider">Postal Code</p>
                                                <p className="text-white/90 font-medium text-sm">{kycData.postalCode}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold text-white/40 tracking-wider">Country</p>
                                                <p className="text-white/90 font-medium text-sm">{kycData.country}</p>
                                            </div>
                                        </div> */}
                                        <div className="grid grid-cols-4 grid-rows-2 gap-4">
                                            <div className="col-span-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {/* <p className="text-xs font-semibold text-white/40 tracking-wider">Street Address</p>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${kycData.addressType === 0 && kycData.internationalVerified == 1
                                                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hidden'
                                                            : kycData.addressType === 0
                                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                            }`}>
                                                            {kycData.addressType === 0 && kycData.internationalVerified == 1
                                                                ? "Identity Verified"
                                                                : kycData.addressType === 0 ? "Aadhaar Verified" : "GST Verified"}
                                                        </span >*/}

                                                        <p className="text-xs font-semibold text-white/40 tracking-wider">Street Address</p>
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${kycData.internationalVerified == 1
                                                                ? kycData.addressType === 1
                                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                                : kycData.addressType === 1
                                                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                                }`}>
                                                            {kycData.internationalVerified == 1
                                                                ? kycData.addressType === 1
                                                                    ? "Identity Verified"
                                                                    : "Document Verified"
                                                                : kycData.addressType === 1
                                                                    ? "GST Verified"
                                                                    : "Aadhaar Verified"}
                                                        </span>
                                                    </div>
                                                    {formatAddress(kycData.streetAddress)}
                                                </div>
                                            </div>
                                            <div className="row-start-2">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">City/ Town/ Village</p>
                                                    <p className="text-white/90 font-medium text-sm">{kycData.city}</p>
                                                </div>
                                            </div>
                                            <div className="row-start-2">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">State</p>
                                                    <p className="text-white/90 font-medium text-sm">{kycData.state}</p>
                                                </div>
                                            </div>
                                            <div className="row-start-2">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">PIN/ ZIP Code</p>
                                                    <p className="text-white/90 font-medium text-sm">{kycData.postalCode}</p>
                                                </div>
                                            </div>
                                            <div className="row-start-2">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-white/40 tracking-wider">Country</p>
                                                    <p className="text-white/90 font-medium text-sm">{kycData.country}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-white/[0.08]">
                                    {allRejections.length > 0 && (
                                        <button
                                            // onClick={() => openModal("checkRejection")}
                                            onClick={() => { closeModal(); setShowRejectionTimeline(true); setTimeout(() => { document.getElementById('rejection-timeline')?.scrollIntoView({ behavior: 'smooth' }); }, 100); }}
                                            className="px-4 py-2 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-sm font-medium transition-all flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                            Check Rejection ({allRejections.length})
                                        </button>
                                    )}
                                    {hasPermission("kyc_pending", "reject") && (
                                        <button
                                            onClick={() => openModal("reject")}
                                            className="px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-sm font-medium transition-all flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></svg>
                                            Reject
                                        </button>
                                    )}

                                    {hasPermission("kyc_pending", "approve") && kycData.status === "pending" && (
                                        kycData?.diditSession?.status === "In Review" ? (
                                            <button
                                                onClick={() => openModal("send_approval")}
                                                className="px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-sm font-medium transition-all flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                Send for Approval
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => openModal("approve")}
                                                className="px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-sm font-medium transition-all flex items-center gap-2"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                Approve
                                            </button>
                                        )
                                    )}
                                    {/* Approve button for Superadmin / didit_inreview */}
                                    {hasPermission("didit_inreview", "view") && kycData.status === "pending_superadmin" && (
                                        <button
                                            onClick={() => openModal("approve")}
                                            className="px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 text-sm font-medium transition-all flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Approve
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Rejection History Timeline ──────────────────────────────────────── */}
            {allRejections.length > 0 && (
                <div id="rejection-timeline" className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl mt-8 transition-all duration-500">
                    {/* Header */}
                    <button
                        onClick={() => setShowRejectionTimeline(!showRejectionTimeline)}
                        className="w-full relative p-4 border-b border-white/[0.08] flex items-center justify-between overflow-hidden text-left"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-white/[0.02] border-white/[0.08] pointer-events-none" />
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-base">Rejection History</h3>
                            </div>
                        </div>
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-inner">
                                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
                                <span className="text-white/80 text-[11px] font-bold tracking-wide">{allRejections.length} {allRejections.length === 1 ? 'Record' : 'Records'}</span>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/5 transition-all duration-500 ${showRejectionTimeline ? 'rotate-180 bg-white/10' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </div>
                        </div>
                    </button>

                    {showRejectionTimeline && (
                        <div className="p-8 px-4 relative animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="space-y-8 relative">
                                {allRejections.map((rejection: any, idx: number) => {
                                    const recordNum = allRejections.length - idx;
                                    const isLatest = idx === 0;

                                    return (
                                        <div key={rejection.id ?? idx} className="relative flex gap-4 group">
                                            {/* Timeline dot + line */}
                                            <div className="flex flex-col items-center">
                                                <div className="w-2 h-2 rounded-full bg-white/20 mt-2"></div>
                                                {idx < allRejections.length - 0 && (
                                                    <div className="w-0.5 flex-1 bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-transparent my-1"></div>
                                                )}
                                            </div>

                                            {/* Content Card */}
                                            <div className={`flex-1 rounded-2xl border backdrop-blur-md transition-all duration-500 overflow-hidden ${isLatest
                                                ? "bg-[#141414] border-white/[0.08]"
                                                : "bg-[#0a0a0a] border-white/[0.08]"
                                                }`}>
                                                <div className="p-6">
                                                    {/* Card Header */}
                                                    <div className="flex items-start justify-between gap-4 mb-5">
                                                        <div className="flex items-center gap-3">
                                                            <h4 className={`text-md font-bold tracking-wide bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent group-hover:text-white/50`}>
                                                                Attempt #{recordNum}
                                                            </h4>
                                                            {isLatest && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-white/[0.12] to-white/[0.06] text-white/80 border-white/[0.15] text-xs font-medium border tracking-wider">Last Rejection</span>
                                                            )}
                                                        </div>
                                                        {rejection.id && (
                                                            <a
                                                                href={`/admin/kyc/rejected/${rejection.id}`}
                                                                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0a0a0a] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.15] text-white/50 hover:text-white text-xs font-semibold tracking-wide transition-all shadow-sm"
                                                            >
                                                                Review
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                                                                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                                                                </svg>
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* Metadata Grid */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-5 border-y border-white/[0.05]">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                                                <p className="text-xs font-light text-white/40 tracking-wider">Reviewed By</p>
                                                            </div>
                                                            <p className={`text-[13px] font-semibold tracking-wide pl-[22px] text-white/60`}>
                                                                {rejection.rejectedBy || '—'}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs font-light text-white/40 tracking-wider pb-2">Rejected At</p>
                                                            <p className={`text-[13px] font-semibold tracking-wide text-white/60`}>
                                                                {(rejection.rejectedAt || rejection.createdAt)
                                                                    ? new Date(rejection.rejectedAt ?? rejection.createdAt).toLocaleString('en-IN', {
                                                                        dateStyle: 'long',
                                                                        timeStyle: 'short',
                                                                    })
                                                                    : '—'}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <p className="text-xs font-light text-white/40 tracking-wider pb-2">Submitted On</p>
                                                            <p className={`text-[13px] font-semibold tracking-wide text-white/60`}>
                                                                {rejection.createdAt
                                                                    ? new Date(rejection.createdAt).toLocaleString('en-IN', {
                                                                        dateStyle: 'long',
                                                                        timeStyle: 'short',
                                                                    })
                                                                    : '—'}
                                                            </p>
                                                        </div>

                                                        <div className="hidden md:block">
                                                            <p className="text-xs font-light text-white/40 tracking-wider pb-2">KYC Status</p>
                                                            <span className="text-[13px] font-semibold capitalize tracking-wider text-white/60">{rejection.status}</span>
                                                        </div>
                                                    </div>

                                                    {/* Rejection Reason */}
                                                    {rejection.rejectionReason && (
                                                        <div className="mt-5">
                                                            <div className="flex gap-4">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                                    className={`shrink-0 mt-[5px] text-white/30`}
                                                                >
                                                                    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                                                                </svg>
                                                                <p className={`text-[15px] font-medium leading-relaxed tracking-wide text-white/50`}>
                                                                    {rejection.rejectionReason}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Approve / Send Approval Modal */}
            <Modal isOpen={modalType === "approve" || modalType === "send_approval"} onClose={closeModal} title={modalType === "send_approval" ? "Request Approval" : "Approve KYC"}>
                <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/[0.1]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg></div>
                            <div>
                                <p className="text-white/80 font-medium">
                                    {modalType === "send_approval" ? "Send for Approval" : "Confirm Approval"}
                                </p>
                                <p className="text-white/40 text-sm">
                                    {modalType === "send_approval"
                                        ? "Submit this request to superadmin for final review."
                                        : "This will verify the user's identity."}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="text-white/60">
                        {modalType === "send_approval"
                            ? `Are you sure you want to send the KYC for `
                            : `Are you sure you want to approve KYC for `
                        }
                        <span className="text-white font-medium">{kycData.firstName} {kycData.lastName}</span>?
                    </p>
                    <div className="flex gap-3">
                        <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors">Cancel</button>
                        <button onClick={() => handleAction(modalType as "approve" | "send_approval")} disabled={isSubmitting} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-white/15 to-white/10 hover:from-white/20 hover:to-white/15 text-white font-medium transition-all border border-white/[0.1]">
                            {isSubmitting ? "Processing..." : (modalType === "send_approval" ? "Send for Approval" : "Confirm")}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reject Modal */}
            <Modal isOpen={modalType === "reject"} onClose={closeModal} title="Reject KYC">
                <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></svg></div>
                            <div><p className="text-white/70 font-medium">Confirm Rejection</p><p className="text-white/40 text-sm">Please provide a reason for rejection.</p></div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-white/50 text-sm mb-2">Rejection Reason</label>
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter the reason for rejection..." rows={4} className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-white/[0.08] text-white/90 placeholder-white/30 focus:outline-none focus:border-white/[0.2] transition-colors resize-none" />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors">Cancel</button>
                        <button onClick={() => handleAction("reject")} disabled={!rejectReason.trim() || isSubmitting} className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-medium transition-all border border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? "Processing..." : "Reject"}</button>
                    </div>
                </div>
            </Modal>

            {/* ── Document Preview Modal ─────────────────────────────────────── */}
            {previewDoc && (
                <div className="fixed inset-0 z-[100] flex flex-col" onClick={() => setPreviewDoc(null)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

                    {/* Modal Panel */}
                    <div className="relative z-10 flex flex-col w-full h-full" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141414]/80 backdrop-blur-sm flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{previewDoc.name}</p>
                                    <p className="text-white/40 text-xs">{previewDoc.mimeType}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={`${previewDoc.url}&download=1`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-xs font-bold tracking-wide hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Download
                                </a>
                                <button
                                    onClick={() => setPreviewDoc(null)}
                                    className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden p-4">
                            {previewDoc.mimeType.startsWith("image/") ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={previewDoc.url}
                                        alt={previewDoc.name}
                                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                    />
                                </div>
                            ) : (
                                <iframe
                                    src={previewDoc.url}
                                    title={previewDoc.name}
                                    className="w-full h-full rounded-xl border border-white/[0.06]"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function KYCDetailsPage() {
    return (
        <AdminDashboardWrapper requireModule="kyc_pending">
            <KYCDetailsContent />
        </AdminDashboardWrapper>
    );
}