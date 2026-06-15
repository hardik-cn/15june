"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../components/AdminDashboardWrapper";
import PaginationControls from "../../components/PaginationControls";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin/adminFetch";
import { encodeId } from "@/lib/admin/encodeId";
import { List } from "lucide-react";

interface EmailTemplate {
    id: number;
    name: string;
    subject: string;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface KYCRecord {
    id: string;
    userID: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    rejectedAt: string;
    rawRejectedAt: string | null;
    rejectedBy: string;
    reason: string;
    avatar: string;
    accountType: string;
    internationalVerified: boolean;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function RejectedKYCClient() {
    const router = useRouter();
    const { hasPermission } = useAdmin();
    const [searchQuery, setSearchQuery] = useState("");
    const [isMailModalOpen, setIsMailModalOpen] = useState(false);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isSendingMail, setIsSendingMail] = useState(false);

    const [data, setData] = useState<KYCRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ── Fetch data ────────────────────────────────────────────────────────────
    const hasFetchedData = useRef(false);
    useEffect(() => {
        if (hasFetchedData.current) return;
        hasFetchedData.current = true;
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await adminFetch("/api/admin/kyc/rejected");
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                } else {
                    setError(json.error || "Failed to fetch KYC records");
                }
            } catch (err) {
                setError("An error occurred while fetching data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchTemplates = async () => {
            try {
                const res = await adminFetch("/api/admin/email-templates");
                const data = await res.json();
                if (res.ok && data.success) {
                    setTemplates(data.templates);
                }
            } catch (error) {
                console.error("Failed to fetch templates:", error);
            }
        };
        fetchTemplates();
    }, []);

    const openMailModal = (user: any) => {
        setSelectedUser(user);
        setIsMailModalOpen(true);
    };

    const closeMailModal = () => {
        setIsMailModalOpen(false);
        setSelectedUser(null);
    };

    const handleSendMail = async () => {
        if (templates.length === 0) {
            toast.error("No email template found");
            return;
        }
        if (!selectedUser) return;

        setIsSendingMail(true);
        const templateId = templates[0].id;
        try {
            const res = await adminFetch(`/api/admin/email-templates/${templateId}/send`, {
                method: "POST",
                body: JSON.stringify({
                    userId: Number(selectedUser.userID),
                    email: selectedUser.email,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success("Email Rejection sent successfully!");
                closeMailModal();
            } else {
                toast.error(data.error || "Failed to send email");
            }
        } catch (error) {
            toast.error("Error sending email");
        } finally {
            setIsSendingMail(false);
        }
    };

    // ── Derived / filtered data ───────────────────────────────────────────────
    const filteredData = data.filter((item) =>
        item.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination state 
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Pagination calculations
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Reset to page 1 when search query or items per page changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const totalRejected = data.length;
    const individualCount = data.filter(d => d.accountType === 'individual').length;
    const businessCount = data.filter(d => d.accountType !== 'individual').length;

    const today = new Date().toISOString().split('T')[0];
    const rejectedTodayCount = data.filter(d => d.rawRejectedAt && d.rawRejectedAt.split('T')[0] === today).length;

    // ── Loading / error states ────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">

                <div className="relative flex items-center justify-center">

                    {/* Spinner Ring */}
                    <div className="h-16 w-16 rounded-full border-2 border-white/10"></div>

                    <div className="absolute h-16 w-16 rounded-full border-2 border-transparent border-t-white animate-spin"></div>

                    {/* Document Icon */}
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
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Rejected KYC</h1>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Total Rejected", value: totalRejected },
                        { label: "Individual Account", value: individualCount },
                        { label: "Business Account", value: businessCount },
                        { label: "Rejected Today", value: rejectedTodayCount },
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

                {/* Top Pagination Controls */}
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
                                {/* <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Reason</th> */}
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Rejected At</th>
                                <th className="text-right py-4 px-6 text-white/50 text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((kyc) => (
                                <tr key={kyc.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                    {/* User Name */}
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
                                            <p className="text-white/70 truncate">{kyc.email}</p>
                                            <p className="text-white/40 text-sm font-light mt-0.5">{kyc.phone}</p>
                                        </div>
                                    </td>

                                    {/* Verification Document — pill style matching pending page */}
                                    <td className="py-4 px-6 hidden lg:table-cell">
                                        <div className="flex flex-col gap-2">
                                            <div className={`inline-flex items-center w-fit gap-2 px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 hover:bg-white/[0.08] ${kyc.internationalVerified ? 'bg-gradient-to-r from-white/[0.08] to-transparent border-white/[0.15]' : 'bg-gradient-to-r from-white/[0.02] to-transparent border-white/[0.08]'}`}>
                                                {kyc.internationalVerified ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                                                )}
                                                <span className="text-xs font-medium text-white/80 tracking-wide">
                                                    {kyc.internationalVerified ? "International" : "Indian"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Account Type — icon + gradient badge matching pending page */}
                                    <td className="py-4 px-6 hidden lg:table-cell text-white/50 text-sm">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 hover:bg-white/[0.08] ${kyc.accountType === 'individual' ? 'bg-gradient-to-r from-white/[0.08] to-transparent border-white/[0.15]' : 'bg-gradient-to-r from-white/[0.02] to-transparent border-white/[0.08]'}`}>
                                            {kyc.accountType === 'individual' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                            )}
                                            <span className="text-xs font-medium text-white/80 tracking-wide">
                                                {kyc.accountType ? kyc.accountType.charAt(0).toUpperCase() + kyc.accountType.slice(1) : 'N/A'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Reason */}
                                    {/* <td className="py-4 px-6 hidden lg:table-cell">
                                        <p className="text-white/50 text-sm truncate max-w-xs">{kyc.reason}</p>
                                    </td> */}

                                    {/* Rejected At */}
                                    <td className="py-4 px-6 text-white/50 text-sm">{kyc.rejectedAt}</td>

                                    {/* Actions */}
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {hasPermission("kyc_rejected", "view") && (
                                                <button
                                                    onClick={() => router.push(`/admin/kyc/rejected/${encodeId(kyc.id)}`)}
                                                    className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors"
                                                // title="View Details"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                </button>
                                            )}
                                            {hasPermission("kyc_rejected", "send_mail") && (
                                                <button
                                                    onClick={() => openMailModal(kyc)}
                                                    className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]"
                                                // title="Send Mail"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {paginatedData.length === 0 && <div className="py-12 text-center"><p className="text-white/40">No rejected KYC requests found.</p></div>}
                </div>

                {/* Bottom Pagination Controls */}
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

            {/* Send Mail Modal */}
            {isMailModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeMailModal} title="Send KYC Mail" />
                    <div className="relative z-10 w-full max-w-lg mx-4 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-white/[0.1] rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
                            <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                Send Mail
                            </h3>
                            <button onClick={closeMailModal} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-white/70 font-medium">Confirm Send Mail</p>
                                            <p className="text-white/40 text-sm">This will send the pre-configured email template.</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-white/60">
                                    Are you sure you want to send mail to{" "}
                                    <span className="text-white font-medium">
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </span>?
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={closeMailModal} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendMail}
                                        disabled={isSendingMail}
                                        className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-medium transition-all border border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSendingMail ? "Sending..." : "Confirm"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
