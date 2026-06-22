"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import AdminDashboardWrapper, { useAdmin } from "../../components/AdminDashboardWrapper";
import { adminFetch } from "@/lib/admin/adminFetch";
import { toast } from "sonner";
import PaginationControls from "../../components/PaginationControls";

interface DeletedUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    ActiveStatus: number;
    LastStatus?: number | null;
    createdAt: string;
    updatedAt: string;
    avatar: string;
}

const getRelativeTime = (dateString?: string | null): string => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    const diffInSeconds = Math.floor((date.getTime() - Date.now()) / 1000);
    const abs = Math.abs(diffInSeconds);

    if (abs < 60) return "Just now";

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    const units = [
        { unit: "year", sec: 31536000 },
        { unit: "month", sec: 2592000 },
        { unit: "week", sec: 604800 },
        { unit: "day", sec: 86400 },
        { unit: "hour", sec: 3600 },
        { unit: "minute", sec: 60 },
    ] as const;

    for (const { unit, sec } of units) {
        if (abs >= sec) {
            const value = Math.floor(diffInSeconds / sec);
            return rtf.format(value, unit);
        }
    }

    return "Just now";
};

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "md" | "lg";
}) => {
    if (!isOpen) return null;
    const sizeClasses = { md: "max-w-lg", lg: "max-w-2xl" };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${sizeClasses[size]} mx-4 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-white/[0.1] rounded-2xl shadow-2xl`}>
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

const LoadingSkeleton = () => (
    <div className="animate-pulse">
        <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] p-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-white/[0.04]">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1">
                        <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                        <div className="h-3 bg-white/10 rounded w-48" />
                    </div>
                    <div className="h-8 bg-white/10 rounded w-24" />
                </div>
            ))}
        </div>
    </div>
);

function DeletedUsersContent() {
    const { hasPermission } = useAdmin();
    const [users, setUsers] = useState<DeletedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [restoreTarget, setRestoreTarget] = useState<DeletedUser | null>(null);
    const [restoring, setRestoring] = useState(false);

    const canEdit = hasPermission("onbusers_deleted", "edit");

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchDeletedUsers = async () => {
            try {
                setLoading(true);
                const response = await adminFetch("/api/admin/users");
                const data = await response.json();
                if (data.success) {
                    // Filter only deleted users (ActiveStatus === 3)
                    const deleted = data.data.filter(
                        (u: DeletedUser) => Number(u.ActiveStatus) === 3
                    );
                    setUsers(deleted);
                } else {
                    setError(data.error || "Failed to fetch users");
                }
            } catch (err) {
                setError("Failed to fetch users");
                console.error("Error fetching deleted users:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDeletedUsers();
    }, []);

    const handleRestore = async () => {
        if (!restoreTarget) return;
        setRestoring(true);
        try {
            const response = await adminFetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: restoreTarget.id,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setUsers(prev => prev.filter(u => u.id !== restoreTarget.id));
                toast.success(`${restoreTarget.firstName} ${restoreTarget.lastName} has been restored.`);
                setRestoreTarget(null);
            } else {
                toast.error(data.error || "Failed to restore user");
            }
        } catch (err) {
            console.error("Error restoring user:", err);
            toast.error("Failed to restore user");
        } finally {
            setRestoring(false);
        }
    };

    const filtered = users.filter(
        (u) =>
            u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Pagination calculations
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = filtered.slice(startIndex, endIndex);

    // Reset to page 1 when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">
                        Deleted Users
                    </h1>
                </div>
            </div>
            {/* Stat Cards */}
            {!loading && !error && (
                // <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Total Deleted</p>
                //         <p className="text-2xl font-bold text-white/90">{users.length}</p>
                //     </div>
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Deleted Today</p>
                //         <p className="text-2xl font-bold text-red-400">
                //             {users.filter(u => new Date(u.updatedAt).toDateString() === new Date().toDateString()).length}
                //         </p>
                //     </div>
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Deleted This Week</p>
                //         <p className="text-2xl font-bold text-white/70">
                //             {users.filter(u => {
                //                 const d = new Date(u.updatedAt);
                //                 const now = new Date();
                //                 const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                //                 return d >= weekAgo && d <= now;
                //             }).length}
                //         </p>
                //     </div>
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Deleted This Month</p>
                //         <p className="text-2xl font-bold text-white/60">
                //             {users.filter(u => {
                //                 const d = new Date(u.updatedAt);
                //                 const now = new Date();
                //                 return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                //             }).length}
                //         </p>
                //     </div>
                // </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Total Deleted</p>
                        <p className="text-3xl font-bold text-white/90">{users.length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Deleted Today</p>
                        <p className="text-3xl font-bold text-white/90">{users.filter(u => new Date(u.updatedAt).toDateString() === new Date().toDateString()).length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Deleted This Week</p>
                        <p className="text-3xl font-bold text-white/90">{users.filter(u => {
                            const d = new Date(u.updatedAt);
                            const now = new Date();
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            return d >= weekAgo && d <= now;
                        }).length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Deleted This Month</p>
                        <p className="text-3xl font-bold text-white/90">{users.filter(u => {
                            const d = new Date(u.updatedAt);
                            const now = new Date();
                            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        }).length}</p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                    type="text"
                    placeholder="Search deleted users by name, email, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-white/90 placeholder-white/30 focus:outline-none focus:border-white/[0.2]"
                />
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
            {loading ? (
                <LoadingSkeleton />
            ) : error ? (
                <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] p-12 text-center">
                    <p className="text-white/60 mb-2">{error}</p>
                    <button onClick={() => window.location.reload()} className="text-white/50 hover:text-white/80 text-sm">Try again</button>
                </div>
            ) : (
                <>
                    <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.08]">
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">User Name</th>
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Email | Mobile No.</th>
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Status</th>
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Deleted At</th>
                                    {canEdit && (
                                        <th className="text-right py-4 px-6 text-white/50 text-sm font-medium">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {totalItems === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 5 : 4} className="py-12 text-center text-white/40">
                                            {searchQuery ? "No deleted users match your search." : "No deleted users found."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center border border-white/[0.1]">
                                                        <span className="text-white/80 font-semibold text-sm">{user.avatar}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/90 font-medium">{user.firstName}</p>
                                                        <p className="text-white/40 text-sm">{user.lastName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 hidden md:table-cell">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-white/90 font-medium">{user.email}</p>
                                                    <p className="text-white/40 text-sm">{user.phone}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-white/5 to-white/[0.02] text-white/70 border border-white/[0.08]">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="18" x2="6" y1="6" y2="18" />
                                                        <line x1="6" x2="18" y1="6" y2="18" />
                                                    </svg>
                                                    Deleted
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 hidden lg:table-cell">
                                                <div className="flex flex-col">
                                                    <span className="text-white/90 text-sm mb-1">{format(new Date(user.updatedAt), "dd MMM yyyy, h:mm:ss a")}</span>
                                                    <span className="text-white/40 text-sm">{getRelativeTime(user.updatedAt)}</span>
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-end">
                                                        <button
                                                            onClick={() => setRestoreTarget(user)}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] text-sm font-medium transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                                <path d="M3 3v5h5" />
                                                            </svg>
                                                            Restore
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
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
                </>
            )
            }

            {/* Restore Confirm Modal — only accessible when canEdit */}
            {canEdit && (
                <Modal isOpen={!!restoreTarget} onClose={() => setRestoreTarget(null)} title="Restore User" size="md">
                    {restoreTarget && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                            <path d="M3 3v5h5" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-white/70 font-medium">Confirm Restore</p>
                                        <p className="text-white/40 text-sm">This will set the user's status back to Active.</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-white/60">
                                Are you sure you want to restore{" "}
                                <span className="text-white font-medium">
                                    {restoreTarget.firstName} {restoreTarget.lastName}
                                </span>
                                ?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRestoreTarget(null)}
                                    disabled={restoring}
                                    className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRestore}
                                    disabled={restoring}
                                    className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/90 font-medium border border-white/[0.1] transition-colors disabled:opacity-50"
                                >
                                    {restoring ? "Restoring..." : "Restore"}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
}

export default function DeletedUsersPage() {
    return (
        <AdminDashboardWrapper requireModule="onbusers_deleted">
            <DeletedUsersContent />
        </AdminDashboardWrapper>
    );
}
