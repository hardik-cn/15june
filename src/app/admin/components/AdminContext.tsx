// admin/components/AdminContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin/adminFetch";

export interface UserData {
    firstName: string;
    lastName: string;
    role: string;
    roleName: string;
    permissions: string;
}

interface AdminContextProps {
    userData: UserData;
    hasPermission: (moduleKey: string, perm?: "view" | "create" | "edit" | "delete") => boolean;
    loading: boolean;
}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const [userData, setUserData] = useState<UserData>({
        firstName: "",
        lastName: "",
        role: "",
        roleName: "",
        permissions: "{}"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await adminFetch("/api/admin/profile");
                const data = await res.json();
                if (res.ok) {
                    setUserData({
                        firstName: data.firstName || "",
                        lastName: data.lastName || "",
                        role: data.role || "",
                        roleName: data.roleName || "",
                        permissions: data.permissions || "{}"
                    });
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const hasPermission = (moduleKey: string, perm: "view" | "create" | "edit" | "delete" = "view") => {
        if (!moduleKey) return true;
        if (userData.roleName === "Super Admin" || userData.roleName === "SuperAdmin") return true;
        try {
            const perms = JSON.parse(userData.permissions);
            if (perms[moduleKey] && perms[moduleKey][perm]) {
                return true;
            }
        } catch (e) {
            return false;
        }
        return false;
    };

    return (
        <AdminContext.Provider value={{ userData, hasPermission, loading }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error("useAdmin must be used within an AdminProvider");
    }
    return context;
};
