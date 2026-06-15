"use client";

import React from "react";
import { useAdmin as useAdminOrig, AdminContext as AdminContextOrig } from "./AdminLayoutUI";
import { useRouter } from "next/navigation";

export const useAdmin = useAdminOrig;
export const AdminContext = AdminContextOrig;

interface AdminDashboardWrapperProps {
    children: React.ReactNode;
    requireModule?: string;
    requireAction?: string;
}

export default function AdminDashboardWrapper({ children, requireModule, requireAction = "view" }: AdminDashboardWrapperProps) {
    const { hasPermission, isLoading } = useAdmin();
    const router = useRouter();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-[50vh]">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            </div>
        );
    }

    const unauthorized = requireModule && !hasPermission(requireModule, requireAction);

    if (unauthorized) {
        return (
            <div className="flex-1 flex items-center justify-center text-white h-[70vh]">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
                    <p className="text-white/60 mb-8 max-w-sm mx-auto">You don't have the necessary administrative privileges to view this page.</p>
                    <button
                        onClick={() => router.push("/admin/dashboard")}
                        className="px-6 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] transition-colors border border-white/[0.1] font-medium"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
