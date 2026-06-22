"use client";

import { toast } from "sonner";
import { format } from "date-fns";
import React, { useState, useEffect, useRef } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";
import AdminDashboardWrapper, { useAdmin } from "../../components/AdminDashboardWrapper";
import PaginationControls from "../../components/PaginationControls";


interface DeletedStaff {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    role: string;
    status: number;
    createdAt: Date;
    last_login_at: Date;
    last_login_ip: string;
    updated_at: Date;
    avatar: string;
}

const Modal = ({ isOpen, onClose, title, children, size = "md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "md" | "lg" | "xl" }) => {
    if (!isOpen) return null;
    const sizeClasses = {
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl"
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center !mt-0">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative z-10 w-full ${sizeClasses[size]} mx-4 bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-white/[0.1] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
                <div className="flex items-center justify-between p-6 border-b border-white/[0.08] sticky top-0 bg-[#1a1a1a] z-1">
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

function DeletedStaffContent() {
    const { hasPermission } = useAdmin();
    const [admins, setAdmins] = useState<DeletedStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleMap, setRoleMap] = useState<Record<string, string>>({});
    const [restoreTarget, setRestoreTarget] = useState<DeletedStaff | null>(null);
    const [restoring, setRestoring] = useState(false);

    const canRestore = hasPermission("staff_deleted", "edit");

    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchRoles = async () => {
            try {
                const res = await adminFetch("/api/admin/staff/roles");
                const data = await res.json();
                if (res.ok && data.success) {
                    const nextMap: Record<string, string> = {};
                    for (const r of data.roles || []) {
                        if (r?.id != null) nextMap[String(r.id)] = r.name;
                    }
                    setRoleMap(nextMap);
                }
            } catch {
                setRoleMap({});
            }
        };

        const fetchDeletedStaff = async () => {
            try {
                setLoading(true);
                const res = await adminFetch("/api/admin/staff/list?type=deleted");
                const data = await res.json();

                if (res.ok && data.success) {
                    const deleted = data.admins.filter(
                        (u: DeletedStaff) => String(u.status) === "3"
                    );
                    const mapped = (deleted || []).map((a: any) => ({
                        id: a.id.toString(),
                        firstName: a.first_name || "",
                        lastName: a.last_name || "",
                        email: a.email,
                        phoneNumber: a.mobile || "",
                        role: a.role != null ? String(a.role) : "",
                        status: Number(a.status),
                        last_login_at: a.last_login_at,
                        last_login_ip: a.last_login_ip || "N/A",
                        createdAt: a.created_at,
                        updated_at: a.updated_at,
                        avatar: ((a.first_name?.[0] || "") + (a.last_name?.[0] || "")).toUpperCase(),
                    }));
                    setAdmins(mapped);
                } else {
                    toast.error(data.error || "Failed to fetch deleted staff");
                    setAdmins([]);
                }
            } catch (e) {
                console.error("Failed to fetch deleted staff:", e);
                toast.error("Failed to fetch deleted staff");
                setAdmins([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
        fetchDeletedStaff();
    }, []);

    const handleRestore = async (admin: DeletedStaff) => {
        if (!canRestore) return;
        setRestoring(true);
        try {
            const res = await adminFetch("/api/admin/staff/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: admin.id,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setAdmins(prev => prev.filter(a => a.id !== admin.id));
                toast.success("Staff restored successfully");
                setRestoreTarget(null);
            } else {
                toast.error(data.error || "Failed to restore staff");
            }
        } catch (e) {
            console.error("Restore staff error:", e);
            toast.error("Failed to restore staff");
        } finally {
            setRestoring(false);
        }
    };

    const filtered = admins.filter(a => {
        const q = searchQuery.toLowerCase();
        return (
            `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            a.phoneNumber.toLowerCase().includes(q)
        );
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">
                        Deleted Admin List
                    </h1>
                </div>
            </div>

            {!loading && (
                // <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Total Deleted</p>
                //         <p className="text-2xl font-bold text-white/90">{admins.length}</p>
                //     </div>
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Deleted Today</p>
                //         <p className="text-2xl font-bold text-red-400">
                //             {admins.filter(u => new Date(u.updated_at).toDateString() === new Date().toDateString()).length}
                //         </p>
                //     </div>
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Deleted This Week</p>
                //         <p className="text-2xl font-bold text-white/70">
                //             {admins.filter(u => {
                //                 const d = new Date(u.updated_at);
                //                 const now = new Date();
                //                 const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                //                 return d >= weekAgo && d <= now;
                //             }).length}
                //         </p>
                //     </div>
                //     <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                //         <p className="text-white/50 text-sm mb-1">Deleted This Month</p>
                //         <p className="text-2xl font-bold text-white/60">
                //             {admins.filter(u => {
                //                 const d = new Date(u.updated_at);
                //                 const now = new Date();
                //                 return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                //             }).length}
                //         </p>
                //     </div>
                // </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Total Deleted</p>
                        <p className="text-3xl font-bold text-white/90">{admins.length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Deleted Today</p>
                        <p className="text-3xl font-bold text-white/90">{admins.filter(u => new Date(u.updated_at).toDateString() === new Date().toDateString()).length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Deleted This Week</p>
                        <p className="text-3xl font-bold text-white/90">{admins.filter(u => {
                            const d = new Date(u.updated_at);
                            const now = new Date();
                            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            return d >= weekAgo && d <= now;
                        }).length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Deleted This Month</p>
                        <p className="text-3xl font-bold text-white/90">{admins.filter(u => {
                            const d = new Date(u.updated_at);
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
                    placeholder="Search by name, email, or role..."
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

            {loading ? (
                <LoadingSkeleton />
            ) : (
                <>
                    <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/[0.08]">
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Users Name</th>
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Email | Mobile No.</th>
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">User Role</th>
                                    {/* <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Status</th> */}
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Last Login</th>
                                    <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Deleted At</th>
                                    {canRestore && (
                                        <th className="text-right py-4 px-6 text-white/50 text-sm font-medium">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {totalItems === 0 ? (
                                    <tr>
                                        <td colSpan={canRestore ? 7 : 6} className="py-12 text-center text-white/40">
                                            {searchQuery ? "No deleted users match your search." : "No deleted users found."}
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((admin) => (
                                        <tr key={admin.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center border border-white/[0.1]">
                                                        <span className="text-white/80 font-semibold text-sm">{admin.avatar}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/90 font-medium">{admin.firstName}</p>
                                                        <p className="text-white/40 text-sm">{admin.lastName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 hidden md:table-cell">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-white/90 font-medium">{admin.email}</p>
                                                    <p className="text-white/40 text-sm">{admin.phoneNumber}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 hidden md:table-cell">
                                                <p className="text-white/90 font-medium">{roleMap[admin.role] || admin.role}</p>
                                            </td>
                                            {/* <td className="py-4 px-6 hidden md:table-cell"> */}
                                            {/* <p className="text-white/90 font-medium">{admin.status === 3 ? "Deleted" : admin.status}</p> */}
                                            {/* </td> */}
                                            {/* <td className="py-4 px-6">
                                                {
                                                    admin.status === 3 && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-white/5 to-white/[0.02] text-white/70 border border-white/[0.08]">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <line x1="18" x2="6" y1="6" y2="18" />
                                                                <line x1="6" x2="18" y1="6" y2="18" />
                                                            </svg>
                                                            Deleted
                                                        </span>
                                                    )
                                                }
                                            </td> */}

                                            <td className="py-4 px-6 hidden md:table-cell">
                                                <p className="text-white/90 text-xs tracking-wide">{admin.last_login_at ? format(new Date(admin.last_login_at), "dd MMM yyyy, h:mm:ss a") : "Never"}</p>
                                                <span className="text-white/40 text-xs">{admin.last_login_ip}</span>
                                            </td>
                                            <td className="py-4 px-6 hidden md:table-cell">
                                                <p className="text-white/90 text-xs tracking-wide">{admin.updated_at ? format(new Date(admin.updated_at), "dd MMM yyyy, h:mm:ss a") : "-"}</p>
                                            </td>
                                            {canRestore && (
                                                <td className="py-4 px-6 text-right">
                                                    <button
                                                        onClick={() => setRestoreTarget(admin)}
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] text-sm font-medium transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8 M3 3v5h5" />
                                                        </svg>
                                                        Restore
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Modal isOpen={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} title="Restore User" size="md">
                        {restoreTarget && (
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2">
                                                <path d="M3 12a9 9 0 1 0 3-6.7" />
                                                <path d="M3 3v5h5" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white/70 font-medium">Confirm Restore</p>
                                            <p className="text-white/40 text-sm">This will restore the account to active.</p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-white/60">
                                    Are you sure you want to restore <span className="text-white font-medium">{restoreTarget.firstName + " " + restoreTarget.lastName}</span>?
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setRestoreTarget(null)}
                                        className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleRestore(restoreTarget)}
                                        disabled={restoring}
                                        className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-medium border border-white/[0.08] transition-colors disabled:opacity-50"
                                    >
                                        {restoring ? "Restoring..." : "Restore"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </Modal>

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
            )}
        </div>
    );
}

export default function DeletedStaffPage() {
    return (
        <AdminDashboardWrapper requireModule="staff_deleted">
            <DeletedStaffContent />
        </AdminDashboardWrapper>
    );
}
