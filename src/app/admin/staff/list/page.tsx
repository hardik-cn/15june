"use client";

import React, { useState, useRef, useEffect } from "react";
import AdminDashboardWrapper, { useAdmin } from "../../components/AdminDashboardWrapper";
import { adminFetch } from "@/lib/admin/adminFetch";
import { toast } from "sonner";
import { format } from "date-fns";
import PaginationControls from "../../components/PaginationControls";

interface Admin {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    role: string;
    status: string;
    lastLoginIp: string;
    lastLogin: string;
    avatar: string;
    createdAt: string;
    twoFactorEnabled: boolean;
}

// Helper function to get relative time (e.g., "4 months ago")
const getRelativeTime = (dateString: string | undefined | null): string => {
    if (!dateString) return "N/A";
    if (dateString === "Never") return "";

    const date = new Date(dateString.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);
    const absDiff = Math.abs(diffInSeconds);

    if (absDiff < 60) return "Just now";

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });

    const shortUnits = [
        { unit: "y", seconds: 31536000 },
        { unit: "mo", seconds: 2592000 },
        { unit: "w", seconds: 604800 },
        { unit: "d", seconds: 86400 },
        { unit: "h", seconds: 3600 },
        { unit: "min", seconds: 60 },
    ] as const;

    for (const { unit, seconds } of shortUnits) {
        if (absDiff >= seconds) {
            const value = Math.trunc(diffInSeconds / seconds);
            return `${Math.abs(value)} ${unit} ${value < 0 ? "ago" : "from now"}`;
        }
    }
    return "Just now";
};

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

const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { className: string }> = {
        active: { className: "bg-[#ffffff0f] text-white border border-white/20" },
        inactive: { className: "bg-[#ffffff0f] text-white/50" },
        suspended: { className: "bg-white/5 text-white/80" },
    };
    const c = config[status] || config.inactive;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.className}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

// const RoleBadge = ({ role }: { role: string }) => {
//     return (
//         <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-400 border-blue-500/30">
//             {role}
//         </span>
//     );
// };

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
                {label} {required && <span className="text-red-400">*</span>}
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
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
};

const AdminActionMenu = ({ admin, adminRole, onView, onEdit, onDelete, index, totalAdmins }: { admin: Admin; adminRole: { label: string; is_system: boolean }; onView: () => void; onEdit: () => void; onDelete: () => void; index: number; totalAdmins: number }) => {
    const { userData, hasPermission } = useAdmin();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isLastItems = totalAdmins > 4 && index >= totalAdmins - 2;

    const isSuperAdmin = userData?.roleName?.toLowerCase().includes("super");
    const isTargetSystemOrSuper = adminRole.is_system || adminRole.label.toLowerCase().includes("super");
    const canModify = isSuperAdmin || !isTargetSystemOrSuper;

    const canEdit = canModify && hasPermission("staff", "edit");
    const canDelete = canModify && hasPermission("staff", "delete");
    const hasActions = canEdit || canDelete;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`flex items-center justify-end gap-2 ${isOpen ? "relative z-[100]" : "relative"}`} ref={menuRef}>
            <button
                onClick={onView}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors text-sm font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                View
            </button>

            {hasActions && (
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`p-1.5 rounded-full transition-all duration-200 ${isOpen ? "bg-white text-black" : "text-white/50 hover:text-white hover:bg-white/[0.08]"}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                    </button>

                    {isOpen && (
                        <div className={`absolute right-0 w-48 bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 ${isLastItems ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"}`}>
                            <div className="p-1">
                                {canEdit && (
                                    <button
                                        onClick={() => { onEdit(); setIsOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white/80 hover:bg-white/[0.05] hover:text-white rounded-lg transition-colors text-left"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                        Edit
                                    </button>
                                )}

                                {canEdit && canDelete && (
                                    <div className="h-px bg-white/[0.08] my-1" />
                                )}

                                {canDelete && (
                                    <button
                                        onClick={() => { onDelete(); setIsOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors text-left"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

function AdminListContent() {
    const { hasPermission } = useAdmin();
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [modalType, setModalType] = useState<"view" | "create" | "edit" | "delete" | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewTab, setViewTab] = useState<"basic" | "activity">("basic");
    const [roleOptions, setRoleOptions] = useState<{ value: string; label: string; is_system: boolean }[]>([]);

    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);

    // Fetch roles from admin_roles table
    const fetchRoles = async () => {
        try {
            const res = await adminFetch("/api/admin/staff/roles");
            const data = await res.json();
            // console.log(data);
            if (res.ok && data.success) {
                setRoleOptions(
                    data.roles.map((r: { id: number; name: string; is_system?: boolean }) => {
                        return {
                            value: r.id.toString(),
                            label: r.name,
                            is_system: r.is_system || false
                        };
                    })
                );
            }
        } catch (error) {
            console.error("Failed to fetch roles:", error);
        }
    };

    // Fetch admins on mount
    const hasFetched = useRef(false);
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        fetchAdmins();
        fetchRoles();
    }, []);

    useEffect(() => {
        const fetchActivityLogs = async () => {
            if (!selectedAdmin || modalType !== "view" || viewTab !== "activity") return;

            setActivityLoading(true);
            try {
                const res = await adminFetch(`/api/admin/staff/activity?adminId=${selectedAdmin.id}`);
                const data = await res.json();
                if (res.ok && data.success) {
                    setActivityLogs(data.logs || []);
                } else {
                    if (data?.error) toast.error(data.error);
                    setActivityLogs([]);
                }
            } catch {
                toast.error("Failed to load activity logs");
                setActivityLogs([]);
            } finally {
                setActivityLoading(false);
            }
        };

        fetchActivityLogs();
    }, [selectedAdmin, modalType, viewTab]);

    const fetchAdmins = async () => {
        setIsLoading(true);
        try {
            const res = await adminFetch("/api/admin/staff/list");
            const data = await res.json();
            // console.log("Admins list data from API (/api/admin/staff/list):", data);
            if (res.ok && data.success) {
                const mappedAdmins = data.admins.map((a: any) => ({
                    id: a.id.toString(),
                    firstName: a.first_name || '',
                    lastName: a.last_name || '',
                    email: a.email,
                    phoneNumber: a.mobile || '',
                    role: a.role != null ? String(a.role) : '',
                    status: Number(a.status) === 1 ? 'active' : 'inactive',
                    lastLoginIp: a.last_login_ip || "N/A",
                    lastLogin: a.last_login_at || 'Never',
                    createdAt: a.created_at, // Updated to map created_at
                    avatar: (a.first_name?.[0] || '') + (a.last_name?.[0] || ''),
                    twoFactorEnabled: a.two_factor_enabled || false,
                }));
                setAdmins(mappedAdmins);
                // console.log("Mapped admins lastLogin:", mappedAdmins.lastLogin);
                // const dateq = new Date(mappedAdmins[0].lastLogin);
                // console.log("Mapped admins dateq:", dateq.toString());
                // const istDate = getISTDate(dateq);
                // console.log("Mapped admins:", istDate); 
            }

        } catch (error) {
            console.error("Failed to fetch admins:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Form state for create/edit
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        role: "",
        status: "active",
        password: "",
        confirmPassword: "",
        twoFactorEnabled: true,
        twoFactorSecret: "",
    });

    // Validation errors state
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Password visibility state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Generate random password
    const generatePassword = () => {
        const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
        const lower = "abcdefghjkmnpqrstuvwxyz";
        const numbers = "123456789";
        const special = "%^&*!@#$";

        let chars = "";
        const getRandom = (set: string, count: number) => {
            let res = "";
            for (let i = 0; i < count; i++) {
                res += set.charAt(Math.floor(Math.random() * set.length));
            }
            return res;
        };

        chars += getRandom(upper, 2);
        chars += getRandom(lower, 2);
        chars += getRandom(special, 2);
        chars += getRandom(numbers, 2);

        // Shuffle the characters
        const newPassword = chars.split('').sort(() => 0.5 - Math.random()).join('');

        setFormData(prev => ({ ...prev, password: newPassword, confirmPassword: newPassword }));
        setShowPassword(true);
        setShowConfirmPassword(true);

        // Clear password errors
        const newErrors = { ...errors };
        delete newErrors.password;
        delete newErrors.confirmPassword;
        setErrors(newErrors);
    };

    // Generate random 2FA secret (base32)
    const generateSecret = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let secret = "";
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    };

    // Validate form
    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Trim all values
        const trimmedFirstName = formData.firstName.trim();
        const trimmedLastName = formData.lastName.trim();
        const trimmedEmail = formData.email.trim();
        const trimmedPhoneNumber = formData.phoneNumber.trim();
        const trimmedPassword = formData.password.trim();
        const trimmedConfirmPassword = formData.confirmPassword.trim();

        // First Name validation
        if (!trimmedFirstName) {
            newErrors.firstName = "First name is required";
        } else if (trimmedFirstName.length < 3) {
            newErrors.firstName = "First name must be at least 3 characters";
        }

        // Last Name validation
        if (!trimmedLastName) {
            newErrors.lastName = "Last name is required";
        } else if (trimmedLastName.length < 3) {
            newErrors.lastName = "Last name must be at least 3 characters";
        }

        // Email validation
        if (!trimmedEmail) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            newErrors.email = "Please enter a valid email";
        }

        // Phone Number validation
        if (!trimmedPhoneNumber) {
            newErrors.phoneNumber = "Phone number is required";
        } else if (!/^\+?[\d\s-]{10,}$/.test(trimmedPhoneNumber)) {
            newErrors.phoneNumber = "Please enter a valid phone number";
        }

        // Role validation
        if (!formData.role) {
            newErrors.role = "User role is required";
        }

        // Status validation
        if (!formData.status) {
            newErrors.status = "Status is required";
        }

        // Password validation (required on create, optional on edit)
        if (modalType === "create") {
            if (!trimmedPassword) {
                newErrors.password = "Password is required";
            } else if (trimmedPassword.length < 6) {
                newErrors.password = "Password must be at least 6 characters";
            }
        }

        // Confirm password validation (only if password is entered)
        if (trimmedPassword || trimmedConfirmPassword) {
            if (trimmedPassword !== trimmedConfirmPassword) {
                newErrors.confirmPassword = "Passwords do not match";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submit
    const handleSubmit = async () => {
        if (!validateForm()) return;

        // Trim and capitalize before submitting
        const submitData = {
            ...formData,
            firstName: formData.firstName.trim().replace(/\b\w/g, c => c.toUpperCase()),
            lastName: formData.lastName.trim().replace(/\b\w/g, c => c.toUpperCase()),
            email: formData.email.trim(),
            phoneNumber: formData.phoneNumber.trim(),
            password: formData.password.trim(),
            role: formData.role ? Number(formData.role) : formData.role,
            status: formData.status === "active" ? 1 : 0,
        };

        if (modalType === "edit" && selectedAdmin) {
            const hasChanges =
                submitData.firstName.trim() !== (selectedAdmin.firstName || "").trim() ||
                submitData.lastName.trim() !== (selectedAdmin.lastName || "").trim() ||
                submitData.email.trim().toLowerCase() !== (selectedAdmin.email || "").trim().toLowerCase() ||
                submitData.phoneNumber.trim() !== (selectedAdmin.phoneNumber || "").trim() ||
                String(submitData.role ?? "") !== String((selectedAdmin as any).role ?? "") ||
                String(submitData.status ?? "") !== String((selectedAdmin as any).status ?? "") ||
                Boolean(submitData.twoFactorEnabled) !== Boolean((selectedAdmin as any).twoFactorEnabled) ||
                (submitData.password && submitData.password.trim() !== "");

            if (!hasChanges) {
                toast.info("No changes detected");
                return;
            }
        }

        // console.log("Submitting:", submitData);

        try {
            let res;
            if (modalType === "create") {
                res = await adminFetch("/api/admin/staff/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(submitData)
                });
            } else {
                // Edit mode
                res = await adminFetch("/api/admin/staff/update", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...submitData, id: selectedAdmin?.id })
                });
            }

            const data = await res.json();

            if (res.ok && data.success) {
                const newAdminFromApi = data.admin;
                // console.log("API Response Data:", data);

                // Map to frontend interface
                const newAdmin: Admin = {
                    id: newAdminFromApi.id.toString(),
                    firstName: submitData.firstName,
                    lastName: submitData.lastName,
                    email: newAdminFromApi.email,
                    phoneNumber: newAdminFromApi.mobile || submitData.phoneNumber,
                    role: newAdminFromApi.role || submitData.role,
                    status: newAdminFromApi.status ? "active" : "inactive",
                    lastLoginIp: modalType === 'edit' && selectedAdmin ? selectedAdmin.lastLoginIp : "N/A",
                    lastLogin: modalType === 'edit' && selectedAdmin ? selectedAdmin.lastLogin : "Never",
                    createdAt: newAdminFromApi.created_at || new Date().toISOString(),
                    avatar: ((newAdminFromApi.first_name?.[0] || '') + (newAdminFromApi.last_name?.[0] || '')).toUpperCase(),
                    twoFactorEnabled: newAdminFromApi.two_factor_enabled || submitData.twoFactorEnabled,
                };
                // console.log("Mapped Frontend Admin Object:", newAdmin);

                if (modalType === "create") {
                    setAdmins(prev => [newAdmin, ...prev]);
                    toast.success("User created successfully!");
                } else {
                    setAdmins(prev => prev.map(a => a.id === newAdmin.id ? newAdmin : a));
                    toast.success("User updated successfully!");
                }


                // Close modal on success
                setSelectedAdmin(null);
                setModalType(null);
                setErrors({});
            } else {
                if (data.error && data.error.includes("email")) {
                    setErrors({ ...errors, email: data.error });
                } else if (data.error && data.error.includes("phone")) {
                    setErrors({ ...errors, phoneNumber: data.error });
                } else {
                    toast.error(data.error || "Operation failed");
                }
            }
        } catch (error) {
            console.error("Failed to submit:", error);
            toast.error("Something went wrong. Please try again.");
        }
    };
    const handleDeleteAdmin = async () => {
        if (!selectedAdmin) return;
        setIsLoading(true);
        try {
            const res = await adminFetch("/api/admin/staff/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedAdmin.id })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setAdmins(prev => prev.filter((a) => String(a.id) !== String(selectedAdmin.id)));
                toast.success("User deleted successfully!");
                closeModal();
            } else {
                toast.error(data.error || "Failed to delete user");
            }
        } catch (error) {
            console.error("Failed to delete admin:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Clear errors when modal closes
    const closeModal = () => {
        setSelectedAdmin(null);
        setModalType(null);
        setErrors({});
    };

    const filteredAdmins = admins.filter((admin) =>
        `${admin.firstName} ${admin.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Pagination calculations
    const totalItems = filteredAdmins.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAdmins = filteredAdmins.slice(startIndex, endIndex);

    // Reset to page 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    const openCreateModal = () => {
        setFormData({
            firstName: "", lastName: "", email: "", phoneNumber: "", role: "", status: "active", password: "", confirmPassword: "",
            twoFactorEnabled: true,
            twoFactorSecret: generateSecret()
        });
        setErrors({});
        setShowPassword(false);
        setShowConfirmPassword(false);
        setModalType("create");
    };

    const openEditModal = (admin: Admin) => {
        setSelectedAdmin(admin);
        setFormData({
            firstName: admin.firstName, lastName: admin.lastName, email: admin.email, phoneNumber: admin.phoneNumber, role: String(admin.role), status: admin.status, password: "", confirmPassword: "",
            twoFactorEnabled: (admin as any).twoFactorEnabled || false,
            twoFactorSecret: "" // Not editable for security/reset only 
        });
        setErrors({});
        setModalType("edit");
    };

    const formatLogAction = (action: string) => {
        switch ((action || "").toUpperCase()) {
            case "LOGIN_SUCCESS":
                return "Logged in";
            case "LOGOUT_SUCCESS":
                return "Logged out";
            case "2FA_VERIFIED":
                return "2FA verified";
            case "STAFF_CREATED":
                return "Staff created";
            case "STAFF_UPDATED":
                return "Staff updated";

            default:
                return action || "Unknown action";
        }
    };

    const formatBrowser = (browser: string) => {
        if (!browser) return "";

        // Chrome 147.0.0.0 → Chrome 147
        const match = browser.match(/([a-zA-Z]+)\s?(\d+)/);
        return match ? `${match[1]} ${match[2]}` : browser;
    };
    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Admin Management</h1>
                        {/* <p className="text-white/40">Manage administrators and their access levels.</p> */}
                    </div>
                    {hasPermission("staff", "create") && (
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-white/15 to-white/10 hover:from-white/20 hover:to-white/15 text-white font-medium transition-all border border-white/[0.1]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                            Add Admin
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Total Admins</p>
                        <p className="text-3xl font-bold text-white/90">{admins.length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Super Admins</p>
                        <p className="text-3xl font-bold text-white/90">{admins.filter(a => {
                            const r = roleOptions.find(ro => ro.value === a.role);
                            return r && r.label.toLowerCase().includes("super");
                        }).length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Active</p>
                        <p className="text-3xl font-bold text-white/90">{admins.filter(a => a.status === "active").length}</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                        <p className="text-white/40 text-sm font-medium mb-2">Inactive</p>
                        <p className="text-3xl font-bold text-white/90">{admins.filter(a => a.status === "inactive").length}</p>
                    </div>


                </div>

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

                {/* Table */}
                <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">Users Name</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden md:table-cell">Email | Mobile No.</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium">User Role</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Status</th>
                                <th className="text-left py-4 px-6 text-white/50 text-sm font-medium hidden lg:table-cell">Last Login</th>
                                <th className="text-right py-4 px-6 text-white/50 text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdmins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-white/40">
                                        {searchQuery ? "No admins found matching your search." : "No admins found."}
                                    </td>
                                </tr>
                            ) : (
                                paginatedAdmins.map((admin, index) => (
                                    <tr key={admin.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center border border-white/[0.1]">
                                                    <span className="text-white/80 font-semibold text-sm">{admin.avatar}</span>
                                                </div>
                                                <div>
                                                    <p className="text-white/90 font-medium">{admin.firstName}</p>
                                                    <p className="text-white/40 text-sm">{admin.lastName}</p>
                                                    {/* <p className="text-white/40 text-sm">Pandya</p> */}

                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 hidden md:table-cell">
                                            <p className="text-white/90 font-medium">{admin.email}</p>
                                            <p className="text-white/40 text-sm">{admin.phoneNumber}</p>
                                        </td>
                                        <td className="py-4 px-6">
                                            {/* <RoleBadge role={roleOptions.find(r => r.value === admin.role)?.label || admin.role} /> */}
                                            {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md transition-all duration-300 hover:bg-white/[0.08] bg-gradient-to-r from-white/[0.08] to-transparent border-white/[0.15]"> */}
                                            {/* <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> */}
                                            <span className="font-medium text-[14px] text-white/90 tracking-wide">
                                                {roleOptions.find(r => r.value === admin.role.toString())?.label ?? admin.role}
                                            </span>
                                            {/* </div> */}
                                        </td>
                                        <td className="py-4 px-6 hidden lg:table-cell">
                                            <StatusBadge status={admin.status} />
                                        </td>
                                        <td className="py-4 px-6 hidden lg:table-cell">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1">
                                                    <span className="text-white/90 text-xs tracking-wide">
                                                        {admin.lastLogin && admin.lastLogin !== "Never"
                                                            ? `${format(new Date(admin.lastLogin), "dd MMM yyyy, h:mm:ss a")} | `
                                                            : "Never"}
                                                    </span>
                                                    <span className="text-gray-400/80 text-xs">{getRelativeTime(admin.lastLogin)}</span>
                                                </span>
                                                <span className="text-white/40 text-xs">{admin.lastLoginIp}</span>
                                                {/* {admin.lastLogin && admin.lastLogin !== "Never" && !isNaN(new Date(admin.lastLogin).getTime()) ? (
                                                    <span className="text-white/40 text-sm">{format(new Date(admin.lastLogin), "yyyy-MM-dd HH:mm")}</span>
                                                ) : null} */}
                                                {/* <span className="text-white/40 text-sm">{getRelativeTime(admin.lastLogin)}</span> */}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => { setSelectedAdmin(admin); setModalType("view"); }} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                </button>
                                                {hasPermission("staff", "edit") && (
                                                    <button onClick={() => { openEditModal(admin); }} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                                    </button>
                                                )}
                                                {hasPermission("staff", "delete") && (
                                                    <button onClick={() => { setSelectedAdmin(admin); setModalType("delete"); }} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05]">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /></svg>
                                                    </button>
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

                {/* View Modal */}
                <Modal isOpen={modalType === "view"} onClose={() => { setSelectedAdmin(null); setModalType(null); }} title="Admin Details" size="xl">
                    {selectedAdmin && (
                        <div className="space-y-6">
                            {/* Profile Header */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-full bg-[#2a2a2a] text-white/90 flex items-center justify-center text-xl font-bold border border-white/10 shadow-xl shadow-black/20">
                                    {selectedAdmin.avatar}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1.5">{selectedAdmin.firstName} {selectedAdmin.lastName}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 rounded-full bg-[#1f1f1f] border border-white/10 text-white/70 text-xs font-medium tracking-wide">
                                            {roleOptions.find(r => r.value === selectedAdmin.role.toString())?.label ?? selectedAdmin.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-white/10 flex gap-6">
                                <button
                                    onClick={() => setViewTab("basic")}
                                    className={`pb-3 text-sm font-medium transition-all relative tracking-wide ${viewTab === "basic" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                                >
                                    Basic Information
                                    {viewTab === "basic" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-t-full"></span>}
                                </button>
                                <button
                                    onClick={() => setViewTab("activity")}
                                    className={`pb-3 text-sm font-medium transition-all relative tracking-wide ${viewTab === "activity" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                                >
                                    Activity Logs
                                    {viewTab === "activity" && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-white rounded-t-full"></span>}
                                </button>
                            </div>

                            {/* Tab Content */}
                            {viewTab === "basic" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Account Details */}
                                    <div className="bg-[#141414] rounded-2xl p-5 border border-white/[0.06]">
                                        <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                            Account Details
                                        </h3>
                                        <div className="space-y-5">

                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center text-white/50 shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-white/40 text-xs tracking-wider font-semibold mb-0.5">Full Name</p>
                                                    <p className="text-white font-medium text-sm tracking-wide">{selectedAdmin.firstName} {selectedAdmin.lastName}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center text-white/50 shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-white/40 text-xs tracking-wider font-semibold mb-0.5">Account Created</p>
                                                    <p className="text-white font-medium text-sm tracking-wide">{selectedAdmin.createdAt ? format(new Date(selectedAdmin.createdAt), "dd MMM yyyy, h:mm:ss a") : ""}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Information */}
                                    <div className="bg-[#141414] rounded-2xl p-5 border border-white/[0.06] h-fit">
                                        <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                            Contact Information
                                        </h3>
                                        <div className="space-y-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center text-white/50 shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-white/40 text-xs tracking-wider font-semibold mb-0.5">Email Address</p>
                                                    <p className="text-white font-medium truncate text-sm tracking-wide">{selectedAdmin.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#1f1f1f] flex items-center justify-center text-white/50 shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-white/40 text-xs tracking-wider font-semibold mb-0.5">Phone Number</p>
                                                    <p className="text-white font-medium text-sm tracking-wide">{selectedAdmin.phoneNumber}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-white font-semibold">Recent Activity</h3>
                                    </div>

                                    <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-3">


                                        {
                                            // activityLoading ? (
                                            //     <div className="p-4 rounded-xl bg-[#141414] border border-white/[0.06] text-white/60 text-sm">
                                            //         Loading...
                                            //     </div>
                                            // ) : 
                                            // (activityLogs || []).length === 0 ? (
                                            //     <div className="p-4 rounded-xl bg-[#141414] border border-white/[0.06] text-white/60 text-sm">
                                            //         No activity logs found.
                                            //     </div>
                                            // ) : 
                                            (
                                                (activityLogs || [])
                                                    .map((log: any) => {
                                                        const formattedAction = formatLogAction(log.logAction);

                                                        return (
                                                            <div
                                                                key={log.id}
                                                                className="flex items-center justify-between p-4 rounded-xl bg-[#141414] border border-white/[0.06] hover:bg-[#1a1a1a] transition-colors"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-full bg-[#1f1f1f] flex items-center justify-center text-white/50 border border-white/5">
                                                                        <svg
                                                                            xmlns="http://www.w3.org/2000/svg"
                                                                            width="16"
                                                                            height="16"
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth="2"
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                        >
                                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                                        </svg>
                                                                    </div>

                                                                    <div className="flex flex-col gap-1">
                                                                        {/* Action */}
                                                                        <p className="text-white font-medium text-sm tracking-wider">
                                                                            {formattedAction}
                                                                        </p>

                                                                        <p className="text-white/70 text-xs mt-0.5 tracking-wider">
                                                                            {log.device}
                                                                            {log.os ? ` [${log.os}]` : ""}{" "}
                                                                            | {formatBrowser(log.browser)}
                                                                            {log.ipAddress ? ` | ${log.ipAddress}` : ""}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                <p className="text-white/90 text-sm font-medium tracking-wider">
                                                                    {log.createdAt ? format(new Date(log.createdAt), "dd MMM yyyy, h:mm:ss a") : ""}
                                                                </p>
                                                            </div>
                                                        );
                                                    })
                                            )}
                                    </div>

                                </div>
                            )}
                        </div>
                    )}
                </Modal>

                {/* Create/Edit Modal */}
                <Modal
                    isOpen={modalType === "create" || modalType === "edit"}
                    onClose={closeModal}
                    title={modalType === "create" ? "Create New Admin" : "Edit Admin"}
                    size="xl">
                    <div className="space-y-6">
                        {/* Row 1: First Name & Last Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/50 text-sm mb-2">First Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => { setFormData({ ...formData, firstName: e.target.value }); if (errors.firstName) setErrors({ ...errors, firstName: "" }); }}
                                    placeholder="Enter first name"
                                    className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${errors.firstName ? "border-red-500/50" : "border-white/[0.08]"} text-white/90 focus:border-white/[0.2] focus:outline-none`}
                                />
                                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                            </div>
                            <div>
                                <label className="block text-white/50 text-sm mb-2">Last Name <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => { setFormData({ ...formData, lastName: e.target.value }); if (errors.lastName) setErrors({ ...errors, lastName: "" }); }}
                                    placeholder="Enter last name"
                                    className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${errors.lastName ? "border-red-500/50" : "border-white/[0.08]"} text-white/90 focus:border-white/[0.2] focus:outline-none`}
                                />
                                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                            </div>
                        </div>

                        {/* Row 2: Email & Phone Number */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/50 text-sm mb-2">
                                    Email Address <span className="text-red-400">*</span>
                                    {modalType === "edit" && <span className="text-white/30 ml-1 text-xs"></span>}
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: "" }); }}
                                    placeholder="Enter email address"
                                    className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${errors.email ? "border-red-500/50" : "border-white/[0.08]"} text-white/90 focus:border-white/[0.2] focus:outline-none`}
                                />
                                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-white/50 text-sm mb-2">Mobile Number <span className="text-red-400">*</span></label>
                                <input
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => { setFormData({ ...formData, phoneNumber: e.target.value }); if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: "" }); }}
                                    placeholder="Enter mobile number"
                                    className={`w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border ${errors.phoneNumber ? "border-red-500/50" : "border-white/[0.08]"} text-white/90 focus:border-white/[0.2] focus:outline-none`}
                                />
                                {errors.phoneNumber && <p className="text-red-400 text-xs mt-1">{errors.phoneNumber}</p>}
                            </div>
                        </div>

                        {/* Row 3: Role & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <CustomSelect
                                    label="User Role"
                                    value={formData.role}
                                    onChange={(value) => { setFormData({ ...formData, role: value }); if (errors.role) setErrors({ ...errors, role: "" }); }}
                                    options={roleOptions}
                                    placeholder={roleOptions.length === 0 ? "Loading roles..." : "Select a role"}
                                    error={errors.role}
                                    required={true}
                                />
                            </div>
                            <div>
                                <CustomSelect
                                    label="Status"
                                    value={formData.status}
                                    onChange={(value) => setFormData({ ...formData, status: value })}
                                    options={[
                                        { value: "active", label: "Active" },
                                        { value: "inactive", label: "Inactive" }
                                    ]}
                                    placeholder="Select status"
                                />
                            </div>
                        </div>

                        {/* Row 4: Two-Factor Authentication Toggle */}
                        <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#0f0f0f] border border-white/[0.08]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-white/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            {formData.twoFactorEnabled && <path d="M9 12l2 2 4-4" />}
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-white/80 text-sm font-medium">
                                            {formData.twoFactorEnabled ? "2FA is enabled for this account" : "2FA is disabled for this account"}
                                        </p>
                                    </div>
                                </div>
                                {/* Toggle Switch */}
                                {modalType === "create" ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!formData.twoFactorEnabled) {
                                                setFormData({
                                                    ...formData,
                                                    twoFactorEnabled: true,
                                                });
                                            }
                                        }}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${formData.twoFactorEnabled
                                                ? "bg-emerald-500"
                                                : "bg-white/[0.1]"
                                            }`}
                                        aria-pressed={formData.twoFactorEnabled}
                                    >
                                        <span
                                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${formData.twoFactorEnabled
                                                    ? "translate-x-5"
                                                    : "translate-x-0"
                                                }`}
                                        />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, twoFactorEnabled: !formData.twoFactorEnabled })}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${formData.twoFactorEnabled ? "bg-emerald-500" : "bg-white/[0.1]"
                                            }`}
                                        aria-pressed={formData.twoFactorEnabled}>
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${formData.twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                                            }`} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Row 5: Password & Confirm Password (Create Only) */}
                        {modalType === "create" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-white/50 text-sm mb-2">Password <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={formData.password}
                                            onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (errors.password) setErrors({ ...errors, password: "" }); }}
                                            placeholder="Enter password"
                                            className={`w-full pl-4 pr-20 py-3 rounded-xl bg-[#0f0f0f] border ${errors.password ? "border-red-500/50" : "border-white/[0.08]"} text-white/90 focus:border-white/[0.2] focus:outline-none`}
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={generatePassword}
                                                className="text-white/40 hover:text-white transition-colors p-1"
                                                title="Generate Password"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="text-white/40 hover:text-white transition-colors p-1"
                                            >
                                                {showPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.1" /><line x1="1" x2="23" y1="1" y2="23" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                                </div>
                                <div>
                                    <label className="block text-white/50 text-sm mb-2">Confirm Password <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={formData.confirmPassword}
                                            onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" }); }}
                                            placeholder="Confirm password"
                                            className={`w-full pl-4 pr-10 py-3 rounded-xl bg-[#0f0f0f] border ${errors.confirmPassword ? "border-red-500/50" : "border-white/[0.08]"} text-white/90 focus:border-white/[0.2] focus:outline-none`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                        >
                                            {showConfirmPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.1" /><line x1="1" x2="23" y1="1" y2="23" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                            )}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-3 rounded-full bg-[#1a1a1a] hover:bg-[#252525] text-white font-medium transition-colors border border-white/[0.1]">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3 rounded-full bg-white hover:bg-gray-200 text-black font-semibold transition-all shadow-lg shadow-white/10">
                                {modalType === "create" ? "Create Admin" : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={modalType === "delete"} onClose={closeModal} title="Delete User" size="md">
                    {selectedAdmin && (
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
                                Are you sure you want to delete <span className="text-white font-medium">{selectedAdmin.firstName + " " + selectedAdmin.lastName}</span>?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={closeModal} className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/70 font-medium transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleDeleteAdmin} disabled={isLoading} className="flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-medium border border-white/[0.08] transition-colors">
                                    {isLoading ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

            </div>
        </>
    );
}

export default function AdminList() {
    return (
        <AdminDashboardWrapper requireModule="staff">
            <AdminListContent />
        </AdminDashboardWrapper>
    );
}
