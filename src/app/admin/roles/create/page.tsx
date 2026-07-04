"use client";

import { toast } from 'sonner';
import React, { useState } from "react";
import AdminDashboardWrapper from "../../components/AdminDashboardWrapper";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin/adminFetch";


// ─── Permission config ────────────────────────────────────────────────────────

type PermKey = "view" | "create" | "edit" | "delete" | "approve" | "reject" | "send_mail" | "didit_inreview" | "test_mail";

interface ModuleConfig {
    key: string;
    label: string;
    perms: PermKey[];
}

const MODULES: ModuleConfig[] = [
    // { key: "dashboard", label: "Dashboard", perms: ["view"] },
    { key: "kyc_pending", label: "KYC – Pending", perms: ["view", "approve", "reject"] },
    { key: "kyc_approved", label: "KYC – Approved", perms: ["view"] },
    { key: "kyc_rejected", label: "KYC – Rejected", perms: ["view", "send_mail"] },
    { key: "didit_inreview", label: "Didit In Review by Admin", perms: ["view"] },
    { key: "email_templates", label: "Email Templates", perms: ["view", "create", "edit", "test_mail"] },
    { key: "onbusers", label: "User Management", perms: ["view", "edit", "delete"] },
    { key: "onbusers_deleted", label: "User Deleted", perms: ["view", "edit"] },
    { key: "staff", label: "Admin Management", perms: ["view", "create", "edit", "delete"] },
    { key: "staff_deleted", label: "Admin Deleted", perms: ["view", "edit"] },
    { key: "roles", label: "Roles & Permissions", perms: ["view", "create", "edit", "delete"] },
    // { key: "change_password", label: "Change Password", perms: ["view", "edit"] },
];

const PERM_LABEL: Record<PermKey, string> = {
    view: "Read",
    create: "Create",
    edit: "Update",
    delete: "Delete",
    approve: "Approve",
    reject: "Reject",
    send_mail: "Send Mail",
    didit_inreview: "Didit In Review",
    test_mail: "Test Mail",
};

type PermissionsState = Record<string, Record<PermKey, boolean>>;

const buildEmptyPerms = (): PermissionsState =>
    Object.fromEntries(
        MODULES.map(m => [
            m.key,
            Object.fromEntries(m.perms.map(p => [p, false])) as Record<PermKey, boolean>,
        ])
    );

// ─── Checkbox atom ────────────────────────────────────────────────────────────

const CB = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        type="button"
        onClick={onChange}
        className={`w-[18px] h-[18px] rounded border flex items-center justify-center transition-all shrink-0 ${checked
            ? "bg-white border-white"
            : "bg-white/[0.04] border-white/20 hover:border-white/40"
            }`}
    >
        {checked && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
            </svg>
        )}
    </button>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateRolePage() {
    const router = useRouter();
    const [roleName, setRoleName] = useState("");
    const [permissions, setPermissions] = useState<PermissionsState>(buildEmptyPerms());
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // ── helpers ──────────────────────────────────────────────────────────────

    const isAllSelected = MODULES.every(m =>
        m.perms.every(p => permissions[m.key]?.[p])
    );

    const toggleAll = () => {
        const next = !isAllSelected;
        setPermissions(
            Object.fromEntries(
                MODULES.map(m => [
                    m.key,
                    Object.fromEntries(m.perms.map(p => [p, next])) as Record<PermKey, boolean>,
                ])
            )
        );
    };

    const toggle = (moduleKey: string, perm: PermKey) => {
        setPermissions(prev => ({
            ...prev,
            [moduleKey]: {
                ...prev[moduleKey],
                [perm]: !prev[moduleKey][perm],
            },
        }));
    };

    // ── validation ───────────────────────────────────────────────────────────

    const validateForm = (): boolean => {
        const trimmed = roleName.trim();

        if (!trimmed) {
            setFormError("Role name is required.");
            return false;
        }
        if (trimmed.length < 3) {
            setFormError("Role name must be at least 3 characters.");
            return false;
        }
        if (trimmed.length > 50) {
            setFormError("Role name must not exceed 50 characters.");
            return false;
        }
        if (!/^[a-zA-Z0-9\s\-&]+$/.test(trimmed)) {
            setFormError("Role name can only contain letters, numbers, spaces, hyphens, or &.");
            return false;
        }

        return true;
    };

    // ── submit ───────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");

        if (!validateForm()) return;

        // Title Case the name before saving
        const formattedName = roleName.trim().replace(/\b\w/g, c => c.toUpperCase());

        setFormLoading(true);
        try {
            const res = await adminFetch("/api/admin/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formattedName,
                    permissions: JSON.stringify(permissions)
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Role created successfully');
                setTimeout(() => { router.push("/admin/roles"); }, 1000);
            } else {
                toast.error(data.error || "Something went wrong. Please try again.");
                setFormError(data.error || "Something went wrong.");
            }
        } catch {
            toast.error("Network error. Please try again.");
            setFormError("Network error. Please check your connection and try again.");
        } finally {
            setFormLoading(false);
        }
    };

    // ── render ───────────────────────────────────────────────────────────────

    return (
        <AdminDashboardWrapper requireModule="roles" requireAction="create">
            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Page header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">
                            Add New Role
                        </h1>
                    </div>
                </div>

                {/* Unified Form Card */}
                <div className="relative rounded-3xl bg-[#0a0a0a]/80 backdrop-blur-3xl border border-white/[0.05] shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden flex flex-col">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent pointer-events-none" />
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />

                    {/* Role Name Section */}
                    <div className="relative z-10 p-8 border-b border-white/[0.06] bg-white/[0.01]">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-white/80 tracking-wide">
                                Role Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={roleName}
                                onChange={e => { setRoleName(e.target.value); setFormError(""); }}
                                placeholder="Enter role name"
                                className={`w-full bg-[#0a0a0a] border ${formError ? 'border-red-500 focus:border-red-500' : 'border-white/[0.1] focus:border-white/30'} rounded-lg px-4 py-2.5 text-white focus:outline-none transition-colors`}
                            />
                            {formError && (
                                <p className="text-red-500 text-xs font-medium tracking-wide flex items-center gap-1.5 mt-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                    {formError}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Permission Matrix Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-8 py-6 border-b border-white/[0.06]">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Select Permissions</h2>
                        </div>
                        <label className="inline-flex items-center gap-3 px-4 py-2 mt-4 sm:mt-0 rounded-xl bg-white/[0.03] border border-white/[0.05] cursor-pointer group hover:bg-white/[0.06] hover:border-white/[0.1] transition-all">
                            <CB checked={isAllSelected} onChange={toggleAll} />
                            <span className="text-white/60 font-semibold group-hover:text-white/90 transition-colors tracking-widest text-sm">Select All</span>
                        </label>
                    </div>

                    {/* Matrix Module List */}
                    <div className="flex flex-col flex-1 divide-y divide-white/[0.04]">
                        {MODULES.map((mod) => (
                            <div key={mod.key} className="flex flex-col xl:flex-row xl:items-center justify-between px-8 py-5 hover:bg-white/[0.02] transition-colors group">
                                <div className="mb-4 xl:mb-0 xl:w-1/3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-white/[0.08] transition-colors">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40 group-hover:text-white/70">
                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path>
                                        </svg>
                                    </div>
                                    <span className="text-white/80 font-medium group-hover:text-white transition-colors">
                                        {mod.label}
                                    </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 xl:gap-8 xl:flex-1">
                                    {(["view", "create", "edit", "delete", "approve", "reject", "send_mail", "didit_inreview", "test_mail"] as PermKey[]).map(perm => {
                                        const supported = mod.perms.includes(perm);
                                        if (!supported) return null;
                                        const isChecked = !!permissions[mod.key]?.[perm];
                                        return (
                                            <label
                                                key={perm}
                                                className={`flex items-center gap-2.5 cursor-pointer py-2 px-3.5 rounded-xl border transition-all duration-300 ${isChecked ? 'bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]'}`}
                                            >
                                                <CB
                                                    checked={isChecked}
                                                    onChange={() => toggle(mod.key, perm)}
                                                />
                                                <span className={`text-sm tracking-wide transition-colors ${isChecked ? 'text-white font-semibold' : 'text-white/50 hover:text-white/80 font-medium'}`}>
                                                    {PERM_LABEL[perm]}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-white/[0.08]">
                    {/* <button
                        type="button"
                        onClick={() => router.push("/admin/roles")}
                        className="px-5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.10] text-white/60 hover:text-white/90 border border-white/[0.08] hover:border-white/[0.20] text-sm font-medium transition-all duration-200 flex items-center gap-2 active:scale-95"
                    >
                        Cancel
                    </button> */}
                    <button
                        type="submit"
                        disabled={formLoading}
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-white to-white/90 hover:from-white hover:to-gray-100 text-black text-sm font-semibold shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_28px_rgba(255,255,255,0.30)] transition-all duration-200 flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {formLoading ? "Saving..." : "Save"}
                    </button>
                </div>

            </form>
        </AdminDashboardWrapper>
    );
}
