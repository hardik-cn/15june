// src/app/admin/kyc/approved/ApprovedKYCClient.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { List } from "lucide-react";
import AdminDashboardWrapper, { useAdmin } from "../../components/AdminDashboardWrapper";
import PaginationControls from "../../components/PaginationControls";
import { adminFetch } from "@/lib/admin/adminFetch";
import { encodeId } from "@/lib/admin/encodeId";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface KYCRecord {
    id: string;
    internationalVerified: boolean;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    submittedAt: string;
    approvedAt: string | null;
    approvedBy: string | null;
    avatar: string;
    accountType: string;
    status: string;
    countryCode: string;
    createdAt: string;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ApprovedKYCClient() {
    const { hasPermission } = useAdmin();
    const router = useRouter();

    // Data state
    const [data, setData] = useState<KYCRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // ── Fetch pending KYC records from the API ────────────────────────────────
    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await adminFetch("/api/admin/kyc/approved");
                const json = await res.json();

                if (!json.success) {
                    setError(json.error || "Failed to fetch KYC records");
                    return;
                }

                const mapped: KYCRecord[] = (json.data ?? []).map((item: any) => ({
                    id: String(item.id),
                    internationalVerified: item.internationalVerified ?? false,
                    firstName: item.firstName || "",
                    lastName: item.lastName || "",
                    email: item.email || "",
                    phone: item.phone || "",
                    countryCode: item.countryCode || "",
                    submittedAt: item.submittedAt || "",
                    approvedAt: item.approvedAt ? format(new Date(item.approvedAt), "dd MMM yyyy, h:mm:ss a") : null,
                    approvedBy: item.approvedBy || null,
                    avatar: item.avatar || "",
                    status: item.status || "",
                    accountType: item.accountType || "",
                    createdAt: item.createdAt || item.creationDate || "", // Use available date for logic
                    rawApprovedAt: item.approvedAt || null,
                }));

                setData(mapped);
            } catch (err) {
                setError("An error occurred while fetching data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // ── Derived / filtered data ───────────────────────────────────────────────

    const filteredData = data.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
            item.firstName.toLowerCase().includes(q) ||
            item.lastName.toLowerCase().includes(q) ||
            item.email.toLowerCase().includes(q) ||
            String(item.id).toLowerCase().includes(q)
        );
    });

    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    // Reset to page 1 when search or page-size changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    // ── Stats ─────────────────────────────────────────────────────────────────

    const totalApproved = data.length;
    const individualCount = data.filter((d) => d.accountType === "individual").length;
    const businessCount = data.filter((d) => d.accountType !== "individual").length;
    const today = new Date().toISOString().split("T")[0];
    const approvedTodayCount = data.filter((d: any) => d.rawApprovedAt && d.rawApprovedAt.split("T")[0] === today).length;

    // ── Loading / error states ────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">

                <div className="relative flex items-center justify-center">

                    {/* Spinner */}
                    <div className="h-16 w-16 rounded-full border-2 border-white/10"></div>

                    <div className="absolute h-16 w-16 rounded-full border-2 border-transparent border-t-white border-r-white animate-spin"></div>

                    {/* Data Icon */}
                    <div className="absolute">
                        <List className="h-7 w-7 text-white" />
                    </div>

                </div>

            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
                    <p className="text-white/50 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white transition-colors border border-white/[0.08]"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">
                            Approved KYC
                        </h1>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Approved", value: totalApproved },
                        { label: "Individual Account", value: individualCount },
                        { label: "Business Account", value: businessCount },
                        { label: "Approved Today", value: approvedTodayCount },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]"
                        >
                            <p className="text-white/40 text-sm font-medium mb-2">{label}</p>
                            <p className="text-3xl font-bold text-white/90">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <svg
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-white/90 placeholder-white/30 focus:outline-none focus:border-white/[0.2] transition-colors"
                        />
                    </div>
                </div>

                {/* Top Pagination */}
                {totalItems > 0 && (
                    <PaginationControls
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        totalItems={totalItems}
                        totalPages={totalPages}
                    />
                )}

                {/* Table */}
                <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">User Name</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Email | Mobile</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Client Type</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Account Type</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Approved At</th>
                                <th className="text-right py-4 px-6 text-white/50 text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((kyc) => (
                                <tr
                                    key={kyc.id}
                                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                >
                                    {/* Name */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center border border-white/[0.1]">
                                                <span className="text-white/80 font-semibold text-sm">{kyc.avatar}</span>
                                            </div>
                                            <div>
                                                <p className="text-white/90 font-medium">{kyc.firstName}</p>
                                                <p className="text-white/40 text-sm">{kyc.lastName}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Email | Mobile */}
                                    <td className="py-4 px-6 hidden md:table-cell">
                                        <div className="flex flex-col max-w-[200px]">
                                            <p className="text-white/70 truncate" title={kyc.email}>{kyc.email}</p>
                                            <p className="text-white/40 text-sm font-light mt-0.5">{kyc.countryCode} {kyc.phone}</p>
                                        </div>
                                    </td>

                                    {/* Verification Document */}
                                    <td className="py-4 px-6 hidden lg:table-cell">
                                        <div
                                            className={`inline-flex items-center w-fit gap-2 px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 hover:bg-white/[0.08] ${kyc.internationalVerified
                                                ? "bg-gradient-to-r from-white/[0.08] to-transparent border-white/[0.15]"
                                                : "bg-gradient-to-r from-white/[0.02] to-transparent border-white/[0.08]"
                                                }`}
                                        >
                                            {kyc.internationalVerified ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                                                    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                                                    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                                                </svg>
                                            )}
                                            <span className="text-xs font-medium text-white/80 tracking-wide">
                                                {kyc.internationalVerified ? "International" : "Indian"}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Account Type */}
                                    <td className="py-4 px-6 hidden lg:table-cell text-white/50 text-sm">
                                        <div
                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 hover:bg-white/[0.08] ${kyc.accountType === "individual"
                                                ? "bg-gradient-to-r from-white/[0.08] to-transparent border-white/[0.15]"
                                                : "bg-gradient-to-r from-white/[0.02] to-transparent border-white/[0.08]"
                                                }`}
                                        >
                                            {kyc.accountType === "individual" ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                                </svg>
                                            )}
                                            <span className="text-xs font-medium text-white/80 tracking-wide">
                                                {kyc.accountType
                                                    ? kyc.accountType.charAt(0).toUpperCase() + kyc.accountType.slice(1)
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Approved */}
                                    <td className="py-4 px-6 hidden lg:table-cell text-white/60 text-xs tracking-wide">
                                        {kyc.approvedAt
                                            ? format(new Date(kyc.approvedAt), "dd MMM yyyy, h:mm:ss a")
                                            : "N/A"}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {hasPermission("kyc_approved", "view") && (
                                                <button
                                                    onClick={() => router.push(`/admin/kyc/approved/${encodeId(kyc.id)}`)}
                                                    className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors"
                                                    title="View"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {paginatedData.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-white/40">No approved KYC requests found.</p>
                        </div>
                    )}
                </div>

                {/* Bottom Pagination */}
                {totalItems > 0 && (
                    <PaginationControls
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        totalItems={totalItems}
                        totalPages={totalPages}
                    />
                )}
            </div>
        </>
    );
}
