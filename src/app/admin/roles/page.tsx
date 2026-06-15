// src/app/admin/roles/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminDashboardWrapper, { useAdmin } from "../components/AdminDashboardWrapper";
import { adminFetch } from "@/lib/admin/adminFetch";
import { encodeId } from "@/lib/admin/encodeId";
import Link from "next/link";
import { toast } from "sonner";
// ─── Types ───────────────────────────────────────────────────────────────────

interface Role {
    id: number;
    name: string;
    permissions: string; // JSON string
    is_system: boolean;
    created_at: string;
    updated_at: string;
    _count: number;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const MoreIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="19" r="1" />
    </svg>
);

const Modal = ({ isOpen, onClose, title, children, size = "lg" }: {
    isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "md" | "lg" | "xl";
}) => {
    if (!isOpen) return null;
    const sizes = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center !mt-0 p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className={`relative z-10 w-full ${sizes[size]} bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200`}>
                <div className="flex items-center justify-between p-6 border-b border-white/[0.08] sticky top-0 bg-[#0f0f0f] z-10">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

function RolesPageContent() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [rolesLoading, setRolesLoading] = useState(true);
    const { hasPermission } = useAdmin();

    const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

    const fetchRoles = useCallback(async () => {
        setRolesLoading(true);
        try {
            const res = await adminFetch("/api/admin/roles");
            const data = await res.json();
            if (res.ok) {
                const fetchedRoles = data.roles || [];
                const sortedRoles = [...fetchedRoles].sort((a: Role, b: Role) => {
                    const isSuperA = a.name === "Super Admin" || a.name === "SuperAdmin";
                    const isSuperB = b.name === "Super Admin" || b.name === "SuperAdmin";
                    if (isSuperA && !isSuperB) return -1;
                    if (!isSuperA && isSuperB) return 1;
                    return 0;
                });
                setRoles(sortedRoles);
            }
        } finally {
            setRolesLoading(false);
        }
    }, []);

    const hasFetched = React.useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        fetchRoles();
    }, [fetchRoles]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDeleteRole = async () => {
        if (!deleteConfirm) return;
        try {
            const res = await adminFetch(`/api/admin/roles/${encodeId(deleteConfirm.id)}`, { method: "DELETE" });
            const data = await res.json();

            if (res.ok) {
                toast.success("Role deleted successfully");
                setRoles(prev => prev.filter(r => r.id !== deleteConfirm.id));
            } else {
                toast.error(data.error || "Failed to delete role.");
            }
        } catch (err) {
            toast.error("Network error. Please try again.");
        } finally {
            setDeleteConfirm(null);
        }
    };

    return (
        <>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">
                            Admin Roles
                        </h1>
                        {/* <p className="text-white/40 text-sm">Manage system access levels and administrative roles</p> */}
                    </div>
                    {hasPermission("roles", "create") && (
                        <Link
                            href="/admin/roles/create"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-white/15 to-white/10 hover:from-white/20 hover:to-white/15 text-white font-medium transition-all border border-white/[0.1]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                            Add Role
                        </Link>
                    )}
                </div>

                {/* ── ROLES GRID ───────────────────────────────────────────────────────── */}
                {rolesLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] p-6 animate-pulse">
                                <div className="h-4 bg-white/[0.05] rounded-lg w-1/2 mb-4" />
                                <div className="h-6 bg-white/[0.05] rounded-lg w-3/4 mb-6" />
                                <div className="h-3 bg-white/[0.03] rounded w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : roles.length === 0 ? (
                    <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] py-24 text-center">
                        <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <p className="text-white/40">No roles found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className="group relative rounded-2xl bg-gradient-to-br from-[#161616] to-[#101010] border border-white/[0.08] hover:border-white/[0.16] p-6 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
                            >
                                {/* Subtle glow on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />

                                {/* Top row — user count + badge + menu */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 hover:bg-white/[0.08] bg-gradient-to-r from-white/[0.08] to-transparent border-white/[0.15]">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                            <span className="text-xs font-medium text-white/80 tracking-wide">
                                                {/* {role._count ?? 0} {(role._count ?? 0) === 1 ? "User" : "Users"} */}
                                                {role._count ?? 0} {(role._count ?? 0) > 1 ? "Users" : "User"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions menu */}
                                    {!role.is_system && role.name !== "Super Admin" && role.name !== "SuperAdmin" && hasPermission("roles", "delete") && (
                                        <div className="relative group/menu">
                                            <button className="p-1.5 rounded-lg text-white/20 hover:text-white/70 hover:bg-white/[0.05] transition-all">
                                                <MoreIcon />
                                            </button>
                                            <div className="absolute right-0 top-full mt-1.5 w-28 bg-[#1a1a1a] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-[99] overflow-hidden">

                                                <button
                                                    onClick={() => setDeleteConfirm(role)}
                                                    className="w-full text-left px-4 py-3 text-sm text-red-400/80 hover:bg-red-500/[0.08] hover:text-red-400 transition-all flex items-center gap-2.5"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Role Name */}
                                <h3 className="text-white/90 font-semibold text-lg mb-1 leading-snug">{role.name}</h3>

                                {/* Divider */}
                                <div className="w-full h-px bg-white/[0.06] my-4" />

                                {/* Footer — dates + edit link */}
                                <div className="flex items-end justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-white/80 text-[14px] tracking-wider font-medium">Created</p>
                                        <p className="text-white/70 text-xs ">{formatDate(role.created_at)}</p>
                                    </div>

                                    <Link
                                        href={`/admin/roles/edit/${encodeId(role.id)}`}
                                        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/90 transition-colors group/edit">
                                        {!role.is_system && role.name !== "Super Admin" && role.name !== "SuperAdmin" && hasPermission("roles", "edit") && (
                                            <>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover/edit:rotate-12 transition-transform duration-200"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                Edit Role
                                            </>
                                        )}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete confirm modal */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Role" size="md">
                {deleteConfirm && (
                    <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.08]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2">
                                        <path d="M3 6h18" />
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-white/70 font-medium">Confirm Deletion</p>
                                    <p className="text-white/40 text-sm">This action cannot be undone.</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-white/60">
                            Are you sure you want to delete <span className="text-white font-medium">"{deleteConfirm.name}"</span>?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDeleteRole} className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-medium border border-white/[0.08] transition-colors">
                                Delete
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}

export default function RolesPage() {
    return (
        <AdminDashboardWrapper requireModule="roles">
            <RolesPageContent />
        </AdminDashboardWrapper>
    );
}
