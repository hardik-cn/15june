// app/admin/components/AdminDashboardWrapper.tsx
"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, createContext, useContext } from "react";
import Link from "next/link";

export const AdminContext = createContext<any>(null);
export const useAdmin = () => useContext(AdminContext);
import { Toaster, toast } from 'sonner';
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_ROUTES } from "@/lib/routes";
import { adminFetch } from "@/lib/admin/adminFetch";

// Safe useLayoutEffect that falls back to useEffect during SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Icons as SVG components
const DashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
);

const KycIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" x2="19" y1="8" y2="14" />
        <line x1="22" x2="16" y1="11" y2="11" />
    </svg>
);

const PendingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const ApproveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const RejectIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" x2="9" y1="9" y2="15" />
        <line x1="9" x2="15" y1="9" y2="15" />
    </svg>
);

const ListIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" x2="21" y1="6" y2="6" />
        <line x1="8" x2="21" y1="12" y2="12" />
        <line x1="8" x2="21" y1="18" y2="18" />
        <line x1="3" x2="3.01" y1="6" y2="6" />
        <line x1="3" x2="3.01" y1="12" y2="12" />
        <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
);

const RolesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const ShieldIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const ChevronDown = ({ isOpen }: { isOpen: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
);

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
);

const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const ActivityIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

const MailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

interface NavItem { label: string; href?: string; icon: React.ReactNode; moduleKey?: string; children?: { label: string; href: string; icon: React.ReactNode; moduleKey?: string; }[]; }

const navItems: NavItem[] = [
    { label: "Dashboard", href: ADMIN_ROUTES.DASHBOARD, icon: <DashboardIcon /> },
    {
        label: "KYC Management", icon: <KycIcon />,
        children: [
            { label: "Pending", href: ADMIN_ROUTES.KYC.PENDING, icon: <PendingIcon />, moduleKey: "kyc_pending" },
            { label: "Approved", href: ADMIN_ROUTES.KYC.APPROVED, icon: <ApproveIcon />, moduleKey: "kyc_approved" },
            { label: "Rejected", href: ADMIN_ROUTES.KYC.REJECTED, icon: <RejectIcon />, moduleKey: "kyc_rejected" },
        ],
    },
    {
        label: "User Management", icon: <UsersIcon />, moduleKey: "onbusers",
        children: [
            { label: "Users list", href: ADMIN_ROUTES.USERS.LIST, icon: <ListIcon />, moduleKey: "onbusers" },
            { label: "Deleted", href: ADMIN_ROUTES.USERS.DELETED, icon: <TrashIcon />, moduleKey: "onbusers_deleted" },
        ],
    },
    {
        label: "Admin Management", icon: <ShieldIcon />,
        children: [
            { label: "Users list", href: ADMIN_ROUTES.STAFF.LIST, icon: <ListIcon />, moduleKey: "staff" },
            { label: "Deleted", href: ADMIN_ROUTES.STAFF.DELETED, icon: <TrashIcon />, moduleKey: "staff_deleted" },
            { label: "Roles & Permissions", href: ADMIN_ROUTES.ROLES, icon: <RolesIcon />, moduleKey: "roles" },
            { label: "Email Templates", href: ADMIN_ROUTES.EMAIL_TEMPLATES.LIST, icon: <MailIcon />, moduleKey: "email_templates" },
            { label: "Activity Log", href: ADMIN_ROUTES.ACTIVITY_LOG, icon: <ActivityIcon />, moduleKey: "activity-log" },
        ],
    },
];


interface AdminLayoutUIProps {
    children: React.ReactNode;
}

export default function AdminLayoutUI({ children }: AdminLayoutUIProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState<string[]>([]);
    const [profileOpen, setProfileOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState({ firstName: "", lastName: "", role: "", roleName: "", permissions: {} as Record<string, any> });
    const profileRef = useRef<HTMLDivElement>(null);
    const hasFetched = useRef(false);

    // Fetch user data
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

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
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, []);

    // Handle logout
    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            const res = await adminFetch("/api/admin/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            if (res.ok) {
                toast.success("Logged out successfully!");
                setTimeout(() => {
                    window.location.href = ADMIN_ROUTES.LOGIN;
                }, 1000);
            } else {
                toast.error("Logout failed. Please try again.");
                console.error("Logout failed");
                setIsLoggingOut(false);
            }
        } catch (error) {
            toast.error("An error occurred during logout.");
            console.error("Logout error:", error);
            setIsLoggingOut(false);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Handle hydration - sync sidebar state from localStorage
    useIsomorphicLayoutEffect(() => {
        const savedSidebarState = localStorage.getItem('admin-sidebar-open');
        if (savedSidebarState !== null) {
            setSidebarOpen(savedSidebarState === 'true');
        }
        setMounted(true);
    }, []);

    // Persist sidebar state to localStorage
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('admin-sidebar-open', String(sidebarOpen));
        }
    }, [sidebarOpen, mounted]);

    const toggleMenu = (label: string) => {
        setOpenMenus((prev) => prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]);
    };

    // Auto-expand menu based on active route
    useEffect(() => {
        const activeParent = navItems.find(item => item.children?.some(child => child.href === pathname));
        if (activeParent) {
            setOpenMenus([activeParent.label]);
        }
    }, [pathname]);

    const isActive = (href: string) => pathname === href;
    const isParentActive = (item: NavItem) => item.children?.some((child) => pathname === child.href);

    // Loading skeleton to prevent flash
    if (!mounted) {
        return (
            <div className="dark min-h-screen bg-[#0a0a0a] flex">
                {/* Sidebar skeleton */}
                <aside className="hidden lg:flex fixed lg:static inset-y-0 left-0 z-50 flex-col w-72 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border-r border-white/[0.08]">
                    <div className="h-16 flex items-center px-6 border-b border-white/[0.08]">
                        <div className="w-32 h-8 bg-white/[0.05] rounded animate-pulse"></div>
                    </div>
                    <div className="flex-1 p-6 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-12 bg-white/[0.03] rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                </aside>
                {/* Main content skeleton */}
                <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                    <header className="h-16 bg-[#0a0a0a]/80 border-b border-white/[0.08] flex items-center justify-between px-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/[0.05] rounded-lg animate-pulse"></div>
                            <div className="hidden md:block space-y-2">
                                <div className="w-40 h-5 bg-white/[0.05] rounded animate-pulse"></div>
                                <div className="w-56 h-4 bg-white/[0.03] rounded animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/[0.05] rounded-lg animate-pulse"></div>
                            <div className="w-10 h-10 bg-white/[0.05] rounded-full animate-pulse"></div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
                        <div className="space-y-6">
                            <div className="h-10 w-64 bg-white/[0.05] rounded-xl animate-pulse"></div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-24 bg-white/[0.03] rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                            <div className="h-64 bg-white/[0.03] rounded-xl animate-pulse"></div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const hasPermission = (moduleKey?: string, action = "view") => {
        if (!moduleKey) return true; // Items without moduleKeys (like Dashboard) are public for all admins

        // SuperAdmin full access
        if (userData.roleName?.toLowerCase().includes("super")) {
            return true;
        }

        let perms = userData.permissions;
        if (typeof perms === "string") {
            try {
                perms = JSON.parse(perms);
                if (typeof perms === "string") {
                    perms = JSON.parse(perms); // handle double stringify just in case
                }
            } catch (e) {
                perms = {};
            }
        }

        if (!perms || !perms[moduleKey]) return false;

        return perms[moduleKey][action] === true;
    };

    const authorizedNavItems = navItems.map(item => {
        if (item.children) {
            const filteredChildren = item.children.filter(child => hasPermission(child.moduleKey));
            return { ...item, children: filteredChildren };
        }
        return item;
    }).filter(item => {
        if (item.children) return item.children.length > 0;
        return hasPermission(item.moduleKey);
    });

    // Sidebar Content Component (shared between desktop and mobile)
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <>
            {/* Logo Section */}
            <div className={`h-16 flex items-center ${sidebarOpen || isMobile ? 'px-6 justify-between' : 'px-4 justify-center'} border-b border-white/[0.08]`}>
                {(sidebarOpen || isMobile) ? (
                    <>
                        <img
                            alt="Logo"
                            loading="lazy"
                            width="130"
                            height="55"
                            decoding="async"
                            style={{ color: 'transparent' }}
                            src="/logo/cantech-logo.svg"
                        />
                        {isMobile && (
                            <button
                                onClick={() => setMobileSidebarOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                            >
                                <CloseIcon />
                            </button>
                        )}
                    </>
                ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/[0.1]">
                        <span className="text-white font-bold text-lg">C</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3">
                <div className="space-y-1">
                    {authorizedNavItems.map((item) => (
                        <div key={item.label}>
                            {item.children ? (
                                <>
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isParentActive(item) ? "bg-white/[0.08] border border-white/[0.1]" : "hover:bg-white/[0.04] border border-transparent"}`}
                                    >
                                        <span>{item.icon}</span>
                                        {(sidebarOpen || isMobile) && (
                                            <>
                                                <span className={`flex-1 text-left ${isParentActive(item) ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{item.label}</span>
                                                <ChevronDown isOpen={openMenus.includes(item.label)} />
                                            </>
                                        )}
                                    </button>
                                    {(sidebarOpen || isMobile) && openMenus.includes(item.label) && (
                                        <div className="mt-1 ml-4 pl-4 border-l border-white/[0.08] space-y-1">
                                            {item.children.map((child) => (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => isMobile && setMobileSidebarOpen(false)}
                                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive(child.href) ? "bg-gradient-to-r from-white/[0.1] to-white/[0.05] border border-white/[0.1] text-white font-medium" : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"}`}
                                                >
                                                    {child.icon}
                                                    <span>{child.label}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link
                                    href={item.href!}
                                    onClick={() => isMobile && setMobileSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isActive(item.href!) ? "bg-gradient-to-r from-white/[0.1] to-white/[0.05] border border-white/[0.1]" : "hover:bg-white/[0.04] border border-transparent"}`}
                                >
                                    <span>{item.icon}</span>
                                    {(sidebarOpen || isMobile) && <span className={`${isActive(item.href!) ? 'text-white' : 'text-white/60 group-hover:text-white/80'}`}>{item.label}</span>}
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </nav>

            {/* Footer */}
            {(sidebarOpen || isMobile) && (
                <div className="p-4 border-t border-white/[0.08]">
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-200 border border-transparent hover:border-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed">
                        <div className="w-5 h-5 flex items-center justify-center">
                            {isLoggingOut ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            ) : (
                                <LogoutIcon />
                            )}
                        </div>
                        <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
                    </button>
                </div>
            )}
        </>
    );

    return (
        <AdminContext.Provider value={{ userData, hasPermission, isLoading }}>
            <div className="dark min-h-screen bg-[#0a0a0a] flex">
                {/* Desktop Sidebar */}
                <aside className={`hidden lg:flex fixed lg:static inset-y-0 left-0 z-50 flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "w-72" : "w-20"} bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border-r border-white/[0.08]`}>
                    <SidebarContent />
                </aside>

                {/* Mobile Sidebar Overlay */}
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}

                {/* Mobile Sidebar */}
                <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] border-r border-white/[0.08] lg:hidden transform transition-transform duration-300 ease-in-out ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <SidebarContent isMobile={true} />
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                    {/* Top Header */}
                    <header className="h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between px-6 sticky top-0 z-40">
                        <div className="flex items-center gap-4">
                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/[0.08]"
                            >
                                <MenuIcon />
                            </button>

                            {/* Desktop sidebar toggle */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="hidden lg:block p-2 rounded-lg hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/[0.08]"
                            >
                                <MenuIcon />
                            </button>

                            <div className="hidden md:block">
                                <h2 className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent font-semibold">
                                    Welcome back, {userData.firstName || ""}
                                </h2>
                                {/* <p className="text-white/40 text-sm">Manage KYC verifications and users</p> */}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* <button className="relative p-2 rounded-lg hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/[0.08]">
                            <BellIcon />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        </button> */}

                            <div className="relative pl-4" ref={profileRef}> {/* border-l border-white/[0.08] */}
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-3 hover:bg-white/[0.03] p-1.5 -my-1.5 -mr-2 rounded-xl transition-colors outline-none">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/[0.1] shadow-inner">
                                        {userData.firstName || userData.lastName ? (
                                            <span className="text-white font-semibold text-sm">
                                                {`${userData.firstName?.[0] || ""}${userData.lastName?.[0] || ""}`.toUpperCase()}
                                            </span>
                                        ) : (
                                            <UserIcon />
                                        )}
                                    </div>
                                    <div className="hidden md:block text-white/40">
                                        <ChevronDown isOpen={profileOpen} />
                                    </div>
                                </button>

                                {/* Dropdown Menu */}
                                {profileOpen && (
                                    <div className="absolute right-0 top-full mt-4 w-60 bg-[#0f0f0f] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                        <div className="p-4 border-b border-white/[0.08] bg-white/[0.02]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/[0.1]">
                                                    <span className="text-white font-semibold text-sm">
                                                        {userData.firstName || userData.lastName
                                                            ? `${userData.firstName?.[0] || ""}${userData.lastName?.[0] || ""}`.toUpperCase()
                                                            : ""}
                                                    </span>
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-white font-medium text-sm truncate">
                                                        {userData.firstName || userData.lastName ? `${userData.firstName} ${userData.lastName}`.trim() : "Admin User"}
                                                    </p>
                                                    <p className="text-white/40 text-xs truncate mt-1">{userData.roleName}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-2 space-y-1">
                                            <Link
                                                href={ADMIN_ROUTES.PROFILE}
                                                onClick={() => setProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
                                                <UserIcon />
                                                Profile
                                            </Link>
                                            {/* <Link
                                            // href={ADMIN_ROUTES.MESSAGES}
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                                        >
                                            <MailIcon />
                                            Messages
                                        </Link> */}

                                            {/* <Link
                                            // href={ADMIN_ROUTES.SETTINGS}
                                            onClick={() => setProfileOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                                        >
                                            <SettingsIcon />
                                            Settings
                                        </Link> */}
                                        </div>

                                        <div className="p-2 border-t border-white/[0.08]">
                                            <button
                                                onClick={handleLogout}
                                                disabled={isLoggingOut}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <div className="w-4 h-4 flex items-center justify-center">
                                                    {isLoggingOut ? (
                                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                    ) : (
                                                        <LogoutIcon />
                                                    )}
                                                </div>
                                                {isLoggingOut ? "Logging out..." : "Logout"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]">
                        {children}
                    </main>
                </div>
            </div>
        </AdminContext.Provider>
    );
}
