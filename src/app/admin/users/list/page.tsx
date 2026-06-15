"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ADMIN_ROUTES } from "@/lib/routes";
import AdminDashboardWrapper, { useAdmin } from "../../components/AdminDashboardWrapper";
import { adminFetch } from "@/lib/admin/adminFetch";
import { encodeId } from "@/lib/admin/encodeId";
import { toast } from "sonner";

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;

    phone: string;
    ActiveStatus: number | string;
    createdAt: string;
    updatedAt: string;
    avatar: string;
}

// Helper function to mask email (e.g., b****@gmail.com)
// const maskEmail = (email: string): string => {
//     const [localPart, domain] = email.split("@");
//     if (!localPart || !domain) return email;
//     const maskedLocal = localPart.charAt(0) + "****";
//     return `${maskedLocal}@${domain}`;
// };

// Helper function to get relative time (e.g., "4 months ago")
const getRelativeTime = (dateString: string | undefined | null): string => {
    if (!dateString) return "N/A";

    const date = new Date(dateString.replace(" ", "T"));
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    const absDiff = Math.abs(diffInSeconds);

    if (absDiff < 60) return "Just now";

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });

    const intervals = [
        { unit: "year", seconds: 31536000 },
        { unit: "month", seconds: 2592000 },
        { unit: "week", seconds: 604800 },
        { unit: "day", seconds: 86400 },
        { unit: "hour", seconds: 3600 },
        { unit: "minute", seconds: 60 },
    ] as const;

    for (const { unit, seconds } of intervals) {
        if (absDiff >= seconds) {
            const count = Math.ceil(diffInSeconds / seconds);
            return rtf.format(count, unit);
        }
    }

    return "Just now";
};

const Modal = ({ isOpen, onClose, title, children, size = "xl" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: "md" | "lg" | "xl" }) => {
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
                <div className="flex items-center justify-between p-6 border-b border-white/[0.08] sticky top-0 bg-[#1a1a1a]">
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

const StatusBadge = ({ status }: { status: string | number }) => {
    let normalizedStatus = "inactive";
    if (status === 1 || status === "active" || status === "1") normalizedStatus = "active";
    else if (status === 2 || status === "inactive" || status === "2") normalizedStatus = "inactive";
    else if (status === 3 || status === "delete" || status === "3" || status === "deleted") normalizedStatus = "delete";

    const config: Record<string, { opacity: string }> = {
        active: { opacity: "from-white/[0.12] to-white/[0.06] text-white/80 border-white/[0.15]" },
        inactive: { opacity: "from-white/[0.06] to-white/[0.03] text-white/50 border-white/[0.08]" },
        delete: { opacity: "from-red-500/20 to-red-500/10 text-red-500 border-red-500/20" },
    };
    const c = config[normalizedStatus] || config.inactive;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${c.opacity} text-xs font-medium border`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
        </span>
    );
};

const LoadingSkeleton = () => (
    <div className="animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                    <div className="h-4 bg-white/10 rounded w-20 mb-2" />
                    <div className="h-8 bg-white/10 rounded w-16" />
                </div>
            ))}
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] p-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-white/[0.04]">
                    <div className="w-10 h-10 rounded-full bg-white/10" />
                    <div className="flex-1">
                        <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                        <div className="h-3 bg-white/10 rounded w-48" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    error?: string;
    required?: boolean;
}

const CustomSelect = ({ label, value, onChange, options, placeholder = "Select option", error, required }: CustomSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === value);
    const selectRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={selectRef}>
            <label className="block text-white/50 text-sm mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${error ? "border-red-500/50" : isOpen ? "border-white/[0.2]" : "border-white/[0.08]"} text-white/90 cursor-pointer flex items-center justify-between transition-all hover:bg-white/[0.02]`}>
                <span className={selectedOption ? "text-white/90" : "text-white/40"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`w-4 h-4 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#1a1a1a] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div>
                        {options.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value === option.value
                                    ? "bg-white/[0.1] text-white"
                                    : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                                    }`}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {error && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert w-3 h-3 flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                    {error}
                </p>
            )}
        </div>
    );
};

import PaginationControls from "../../components/PaginationControls";

function UserListContent() {
    const { hasPermission } = useAdmin();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [modalType, setModalType] = useState<"view" | "edit" | "delete" | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [viewTab, setViewTab] = useState<"info" | "activity">("info");

    // Edit form state
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editStatus, setEditStatus] = useState("");
    const [saveLoading, setSaveLoading] = useState(false);
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});

    // Initialize edit form when selectedUser changes
    useEffect(() => {
        if (selectedUser && modalType === "edit") {
            setEditFirstName(selectedUser.firstName);
            setEditLastName(selectedUser.lastName);
            setEditEmail(selectedUser.email);
            setEditPhone(selectedUser.phone);
            let statusString = "inactive";
            if (selectedUser.ActiveStatus === 1 || selectedUser.ActiveStatus === "active" || selectedUser.ActiveStatus === "1") {
                statusString = "active";
            } else if (selectedUser.ActiveStatus === 2 || selectedUser.ActiveStatus === "inactive" || selectedUser.ActiveStatus === "2") {
                statusString = "inactive";
            }
            setEditStatus(statusString);
            setEditErrors({});
        }
    }, [selectedUser, modalType]);

    // Handle save user
    const handleSaveUser = async () => {
        if (!selectedUser) return;

        const newErrors: Record<string, string> = {};
        const trimmedFirstName = editFirstName.trim();
        const trimmedLastName = editLastName.trim();

        if (!trimmedFirstName) {
            newErrors.firstName = "First name is required";
        } else if (trimmedFirstName.length < 2) {
            newErrors.firstName = "First name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s]+$/.test(trimmedFirstName)) {
            newErrors.firstName = "First name can only contain letters";
        }

        if (!trimmedLastName) {
            newErrors.lastName = "Last name is required";
        } else if (trimmedLastName.length < 2) {
            newErrors.lastName = "Last name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s]+$/.test(trimmedLastName)) {
            newErrors.lastName = "Last name can only contain letters";
        }

        const trimmedEmail = editEmail.trim();
        if (!trimmedEmail) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            newErrors.email = "Please enter a valid email";
        }

        const trimmedPhone = editPhone.trim();
        if (!trimmedPhone) {
            newErrors.phone = "Phone number is required";
        } else if (!/^\+?[\d\s-]{10,}$/.test(trimmedPhone)) {
            newErrors.phone = "Please enter a valid phone number";
        }

        if (!editStatus) {
            newErrors.status = "Status is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setEditErrors(newErrors);
            return;
        }

        try {
            setSaveLoading(true);
            const response = await adminFetch("/api/admin/users", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedUser.id,
                    firstName: editFirstName,
                    lastName: editLastName,
                    email: editEmail,
                    phone: editPhone,
                    ActiveStatus: editStatus,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Update the user in the local state
                // setUsers(prevUsers =>
                //     prevUsers.map(user =>
                //         user.id === selectedUser.id ? data.data : user
                //     )
                // );
                // setSelectedUser(null);
                // setModalType(null);
                // toast.success("User updated successfully!");
                setUsers(prevUsers =>
                    prevUsers.map(u =>
                        u.id === selectedUser.id
                            ? {
                                ...u,
                                firstName: editFirstName,
                                lastName: editLastName,
                                ActiveStatus: editStatus === "active" ? 1 : 2,
                                updatedAt: new Date().toISOString(),
                            }
                            : u
                    )
                );
                setSelectedUser(null);
                setModalType(null);
                toast.success("User updated successfully!");
            } else {
                toast.error(data.error || "Failed to update user");
            }
        } catch (err) {
            console.error("Error updating user:", err);
            toast.error("Failed to update user");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        try {
            setSaveLoading(true);
            const response = await adminFetch("/api/admin/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedUser.id }),
            });

            const data = await response.json();

            if (data.success) {
                // Update local state to reflect deletion locally (status 3) without refresh
                setUsers(prevUsers => prevUsers.map(u => u.id === selectedUser.id ? { ...u, ActiveStatus: 3 } : u));
                setSelectedUser(null);
                setModalType(null);
                toast.success("User deleted successfully!");
            } else {
                toast.error(data.error || "Failed to delete user");
            }
        } catch (err) {
            console.error("Error deleting user:", err);
            toast.error("Failed to delete user");
        } finally {
            setSaveLoading(false);
        }
    };

    // Fetch users from API
    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await adminFetch("/api/admin/users");
                const data = await response.json();

                if (data.success) {
                    setUsers(data.data);
                } else {
                    setError(data.error || "Failed to fetch users");
                }
            } catch (err) {
                setError("Failed to fetch users");
                console.error("Error fetching users:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const filteredData = users.filter((item) =>
        Number(item.ActiveStatus) !== 3 && (
            item.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

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



    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Users List</h1>
                        {/* <p className="text-white/40">Manage all registered users in the system.</p> */}
                    </div>
                </div>
                <LoadingSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Users List</h1>
                        {/* <p className="text-white/40">Manage all registered users in the system.</p> */}
                    </div>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] p-12 text-center">
                    <svg className="w-12 h-12 mx-auto text-white/30 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-white/60 mb-2">{error}</p>
                    <button onClick={() => window.location.reload()} className="text-white/50 hover:text-white/80 text-sm">Try again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Users List</h1>
                </div>
                {/* <Link href="/admin/users/deleted" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/[0.06] to-white/[0.03] hover:from-white/10 hover:to-white/[0.06] text-white/60 hover:text-white/90 font-medium transition-all border border-white/[0.08] text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    Deleted Users
                    {users.filter(u => Number(u.ActiveStatus) === 3).length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-xs font-semibold">
                            {users.filter(u => Number(u.ActiveStatus) === 3).length}
                        </span>
                    )}
                </Link> */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                    <p className="text-white/40 text-sm font-medium mb-2">Total Users</p>
                    <p className="text-3xl font-bold text-white/90">{users.filter(u => u.ActiveStatus !== 3).length}</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                    <p className="text-white/40 text-sm font-medium mb-2">Active</p>
                    <p className="text-3xl font-bold text-white/90">{users.filter(u => u.ActiveStatus === 1).length}</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                    <p className="text-white/40 text-sm font-medium mb-2">Inactive</p>
                    <p className="text-3xl font-bold text-white/90">{users.filter(u => u.ActiveStatus === 2).length}</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                    <p className="text-white/40 text-sm font-medium mb-2">New Today</p>
                    <p className="text-3xl font-bold text-white/90">{users.filter(u => new Date(u.createdAt).toDateString() === new Date().toDateString() && u.ActiveStatus !== 3).length}</p>
                </div>

            </div>

            <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input type="text" placeholder="Search by name, email, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-white/90 placeholder-white/30 focus:outline-none focus:border-white/[0.2]" />
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

            <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/[0.08]">
                            <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">User Name</th>
                            <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Email | Mobile No.</th>
                            <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Status</th>

                            {/* <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Joined At</th> */}
                            <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Joined At</th>
                            <th className="text-right py-4 px-6 text-white/50 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-white/40">
                                    {searchQuery ? "No users found matching your search." : "No users found."}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((user) => (
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
                                    <td className="py-4 px-6"><StatusBadge status={user.ActiveStatus} /></td>

                                    {/* <td className="py-4 px-6 hidden lg:table-cell">
                                        <div className="flex flex-col">
                                            <span className="text-white/80">{user.createdAt}</span>
                                            <span className="text-white/40 text-sm">{getRelativeTime(user.createdAt)}</span>
                                        </div>
                                    </td> */}
                                    <td className="py-4 px-6 hidden lg:table-cell">
                                        <div className="flex flex-col">
                                            <span className="text-white/90 text-sm">{format(new Date(user.createdAt), "dd MMM yyyy, h:mm:ss a")}</span>
                                            <span className="text-white/40 text-sm">{getRelativeTime(user.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => { setSelectedUser(user); setModalType("view"); }} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg></button>
                                            {hasPermission("onbusers", "edit") && (
                                                <button onClick={() => { setSelectedUser(user); setModalType("edit"); }} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg></button>
                                            )}
                                            {hasPermission("onbusers", "delete") && (
                                                <button onClick={() => { setSelectedUser(user); setModalType("delete"); }} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /></svg></button>
                                            )}
                                        </div>
                                    </td>
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

            <Modal isOpen={modalType === "view"} onClose={() => { setSelectedUser(null); setModalType(null); }} title="User Details">
                {selectedUser && (
                    <div className="space-y-6">
                        {/* Avatar + Name */}

                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-full bg-[#2a2a2a] text-white/90 flex items-center justify-center text-xl font-bold border border-white/10 shadow-xl shadow-black/20">{selectedUser.avatar}</div><div><h2 className="text-2xl font-bold text-white mb-1.5">{selectedUser.firstName} {selectedUser.lastName}</h2>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={selectedUser.ActiveStatus} />
                                    {/* <span className="text-white/30 text-xs flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                        Joined {format(new Date(selectedUser.createdAt), "MMM yyyy")}
                                    </span> */}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex items-center gap-6 border-b border-white/[0.08]">
                            <button
                                onClick={() => setViewTab("info")}
                                className={`pb-3 text-sm font-medium transition-colors relative ${viewTab === "info" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                            >
                                Information
                                {viewTab === "info" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />}
                            </button>
                            <button
                                onClick={() => setViewTab("activity")}
                                className={`pb-3 text-sm font-medium transition-colors relative ${viewTab === "activity" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                            >
                                Activity Log
                                {viewTab === "activity" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white rounded-t-full" />}
                            </button>
                        </div>

                        {/* Tab Content */}
                        {viewTab === "info" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <p className="text-white/40 text-sm tracking-wider mb-1">Email Address</p>
                                    <p className="text-white/90 font-medium truncate">{selectedUser.email}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <p className="text-white/40 text-sm tracking-wider mb-1">Phone Number</p>
                                    <p className="text-white/90 font-medium">{selectedUser.phone || "N/A"}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <p className="text-white/40 text-sm tracking-wider mb-1">User ID</p>
                                    <p className="text-white/90 font-mono text-sm truncate">{encodeId(selectedUser.id)}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                    <p className="text-white/40 text-sm tracking-wider mb-1">Last Updated</p>
                                    <p className="text-white/90 font-medium">{getRelativeTime(selectedUser.updatedAt)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center pt-1">
                                        <div className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
                                        <div className="w-px flex-1 bg-white/[0.08] my-1" />
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-white/80 text-sm">Account details updated</p>
                                        <p className="text-white/40 text-xs mt-0.5">{getRelativeTime(selectedUser.updatedAt)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-center pt-1">
                                        <div className="w-2 h-2 rounded-full bg-white/30 shrink-0" />
                                    </div>
                                    <div>
                                        <p className="text-white/80 text-sm">User account created</p>
                                        <p className="text-white/40 text-xs mt-0.5">{format(new Date(selectedUser.createdAt), "dd MMM yyyy, h:mm a")}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => { setSelectedUser(null); setModalType(null); }}
                            className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors border border-white/[0.06]"
                        >
                            Close
                        </button>
                    </div>
                )}
            </Modal>

            <Modal isOpen={modalType === "edit"} onClose={() => { setSelectedUser(null); setModalType(null); }} title="Edit User">
                {selectedUser && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white/50 text-sm mb-2">First Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editFirstName}
                                        onChange={(e) => {
                                            setEditFirstName(e.target.value);
                                            if (editErrors.firstName) setEditErrors(prev => ({ ...prev, firstName: "" }));
                                        }}
                                        className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${editErrors.firstName ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-white/[0.2]"} text-white/90 focus:outline-none transition-colors`}
                                        placeholder="Enter first name"
                                    />
                                    {editErrors.firstName && (
                                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert w-3 h-3 flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                            {editErrors.firstName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-white/50 text-sm mb-2">Last Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editLastName}
                                        onChange={(e) => {
                                            setEditLastName(e.target.value);
                                            if (editErrors.lastName) setEditErrors(prev => ({ ...prev, lastName: "" }));
                                        }}
                                        className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${editErrors.lastName ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08] focus:border-white/[0.2]"} text-white/90 focus:outline-none transition-colors`}
                                        placeholder="Enter last name"
                                    />
                                    {editErrors.lastName && (
                                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert w-3 h-3 flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                            {editErrors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white/50 text-sm mb-2">Email <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        readOnly
                                        className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${editErrors.email ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08]"} text-white/50 focus:outline-none transition-colors`}
                                    />
                                    {editErrors.email && (
                                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert w-3 h-3 flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                            {editErrors.email}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-white/50 text-sm mb-2">Phone Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editPhone}
                                        readOnly
                                        className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${editErrors.phone ? "border-red-500/50 focus:border-red-500" : "border-white/[0.08]"} text-white/50 focus:outline-none transition-colors`}
                                    />
                                    {editErrors.phone && (
                                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-alert w-3 h-3 flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                            {editErrors.phone}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="w-1/3">
                                <CustomSelect
                                    label="Status"
                                    value={editStatus}
                                    onChange={(value) => {
                                        setEditStatus(value);
                                        if (editErrors.status) setEditErrors(prev => ({ ...prev, status: "" }));
                                    }}
                                    options={[
                                        { value: "active", label: "Active" },
                                        { value: "inactive", label: "Inactive" }
                                    ]}
                                    placeholder="Select a status"
                                    error={editErrors.status}
                                    required={true}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSelectedUser(null); setModalType(null); }}
                                className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors"
                                disabled={saveLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveUser}
                                disabled={saveLoading}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-white/15 to-white/10 hover:from-white/20 hover:to-white/15 text-white font-medium border border-white/[0.1] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saveLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </span>
                                ) : "Save Changes"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={modalType === "delete"} onClose={() => { setSelectedUser(null); setModalType(null); }} title="Delete User" size="md">
                {selectedUser && (
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
                            Are you sure you want to delete <span className="text-white font-medium">{selectedUser.firstName + " " + selectedUser.lastName}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => { setSelectedUser(null); setModalType(null); }} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleDeleteUser} disabled={saveLoading} className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-medium border border-white/[0.08] transition-colors">
                                {saveLoading ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>

    );
}

export default function UserList() {
    return (
        <AdminDashboardWrapper requireModule="onbusers">
            <UserListContent />
        </AdminDashboardWrapper>
    );
}
