"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AdminLayoutUI from "./components/AdminLayoutUI";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Do not wrap the login page in the dashboard layout
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
        return <>{children}</>;
    }

    return <AdminLayoutUI>{children}</AdminLayoutUI>;
}
