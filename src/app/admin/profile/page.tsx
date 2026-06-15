"use client";

import React, { useState, useEffect, useRef } from "react";
import AdminDashboardWrapper from "../components/AdminDashboardWrapper";
import { adminFetch } from "@/lib/admin/adminFetch";
import { toast } from 'sonner';

// --- Icons ---
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);


const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
);

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const MapPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
);

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);


// Check Circle Icon for Success
const CheckCircleIcon = () => (
    <div className="relative flex items-center justify-center w-10 h-10">
        <div className="absolute inset-0 bg-emerald-100 rounded-full opacity-50"></div>
        <div className="absolute inset-1 bg-emerald-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        </div>
    </div>
);

// Alert Icon for Error
const AlertCircleIcon = () => (
    <div className="relative flex items-center justify-center w-10 h-10">
        <div className="absolute inset-0 bg-red-100 rounded-full opacity-50"></div>
        <div className="absolute inset-1 bg-red-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>
    </div>
);

// (ToastNotification component removed)

export default function AdminProfilePage() {
    const [activeTab, setActiveTab] = useState("profile");

    // (Toast states removed)
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Mock user data
    const [userData, setUserData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        gender: "",
        dateOfBirth: "",
        country: "India",
        state: "",
        city: "",
        postalCode: "",
        address: "",
        lastLogin: "",
        ipAddress: ""
    });
    const [initialUserData, setInitialUserData] = useState<any>(null);

    const [errors, setErrors] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });


    // API State for Country/State/City
    const [apiCountries, setApiCountries] = useState<{ name: string, flag?: string }[]>([]);
    const [apiStates, setApiStates] = useState<{ name: string, state_code: string }[]>([]);
    const [apiCities, setApiCities] = useState<string[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    // Fetch Countries on Mount
    const hasFetchedCountries = useRef(false);
    useEffect(() => {
        if (hasFetchedCountries.current) return;
        hasFetchedCountries.current = true;

        const fetchCountries = async () => {
            try {
                // Using countriesnow.space for complete list
                const res = await fetch("https://countriesnow.space/api/v0.1/countries/flag/images");
                const data = await res.json();
                if (!data.error) {
                    setApiCountries(data.data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
                }
            } catch (error) {
                // console.error("Failed to fetch countries:", error);
            }
        };
        fetchCountries();
    }, []);

    // Fetch States when Country changes
    const fetchedCountryRef = useRef("");
    useEffect(() => {
        if (!userData.country) {
            setApiStates([]);
            return;
        }
        if (fetchedCountryRef.current === userData.country) return;
        fetchedCountryRef.current = userData.country;

        const fetchStates = async () => {
            setIsLoadingStates(true);
            try {
                const countryParam = userData.country === "United States" ? "United States" : userData.country;
                const res = await fetch(`https://countriesnow.space/api/v0.1/countries/states/q?country=${encodeURIComponent(countryParam)}`);
                const data = await res.json();
                if (!data.error) {
                    const states = data.data.states || [];
                    const uniqueStates = states.filter((state: any, index: number, self: any[]) =>
                        index === self.findIndex((s: any) => s.name === state.name)
                    );
                    setApiStates(uniqueStates);
                } else {
                    setApiStates([]);
                }
            } catch (error) {
                // console.error("Failed to fetch states:", error);
                setApiStates([]);
            } finally {
                setIsLoadingStates(false);
            }
        };
        fetchStates();
    }, [userData.country]);

    // Fetch Cities when State changes
    const fetchedStateRef = useRef("");
    useEffect(() => {
        if (!userData.country || !userData.state) {
            setApiCities([]);
            return;
        }
        // Create a unique key for the country+state combination
        const cacheKey = `${userData.country}-${userData.state}`;
        if (fetchedStateRef.current === cacheKey) return;
        fetchedStateRef.current = cacheKey;

        const fetchCities = async () => {
            setIsLoadingCities(true);
            try {
                const res = await fetch(`https://countriesnow.space/api/v0.1/countries/state/cities/q?country=${encodeURIComponent(userData.country)}&state=${encodeURIComponent(userData.state)}`);
                const data = await res.json();
                if (!data.error) {
                    const cities = data.data || [];
                    // console.log("Raw cities data:", cities);
                    // Remove duplicates, handle objects/strings, sort
                    const uniqueCities = (Array.from(new Set(cities.map((c: any) => String(c).trim())))
                        .filter(Boolean)
                        .sort()) as string[];
                    setApiCities(uniqueCities);
                } else {
                    setApiCities([]);
                }
            } catch (error) {
                // console.error("Failed to fetch cities:", error);
                setApiCities([]);
            } finally {
                setIsLoadingCities(false);
            }
        };
        fetchCities();
    }, [userData.country, userData.state]);

    // Password Visibility State
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [passwordErrors, setPasswordErrors] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });


    const hasFetched = useRef(false);

    const fetchProfile = async () => {
        try {
            // console.log("Fetching profile...");

            setLoading(true);

            const res = await adminFetch("/api/admin/profile");
            const data = await res.json();

            if (!res.ok) {
                // console.error("Failed to fetch profile:", data.error);
                return;
            }

            const fetchedData = {
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                email: data.email || "",
                phone: data.phone || "",
                gender: data.gender || "",
                dateOfBirth: data.dateOfBirth || "",
                country: data.country || "India",
                state: data.state || "",
                city: data.city || "",
                postalCode: data.postalCode || "",
                address: data.address || "",
                lastLogin: data.lastLogin || "Never",
                ipAddress: data.ipAddress || "Unknown",
            };

            setUserData(fetchedData);
            setInitialUserData(fetchedData);
        } catch (error) {
            // console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasFetched.current) return;

        hasFetched.current = true;

        fetchProfile();
    }, []);

    // console.log("AdminProfilePage Render");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Clear error when user types
        setErrors(prev => ({ ...prev, [name]: "" }));

        if (name === "country") {
            setUserData(prev => ({
                ...prev,
                country: value,
                state: "",
                city: ""
            }));
        } else if (name === "state") {
            setUserData(prev => ({
                ...prev,
                state: value,
                city: ""
            }));
        } else {
            setUserData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSave = async () => {
        if (initialUserData && JSON.stringify(userData) === JSON.stringify(initialUserData)) {
            toast.info("No changes detected");
            setIsEditing(false);
            return;
        }

        // Validation
        const newErrors = {
            firstName: userData.firstName.trim() ? "" : "First Name is required",
            lastName: userData.lastName.trim() ? "" : "Last Name is required",
            email: !userData.email.trim()
                ? "Email is required"
                : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)
                    ? "Invalid email format"
                    : "",
            phone: userData.phone.trim() ? "" : "Mobile Number is required"
        };

        if (newErrors.firstName || newErrors.lastName || newErrors.email || newErrors.phone) {
            setErrors({
                firstName: newErrors.firstName,
                lastName: newErrors.lastName,
                phone: newErrors.phone,
                email: newErrors.email
            });
            return;
        }

        try {
            // Combine phone number? The API expects "phone".
            // Ideally we save it as `phoneCode + phoneNumber` or just `phoneNumber`.
            // Let's send it as is for now or combined.
            // The API logic:  mobile: phone,

            const payload = {
                ...userData,
                firstName: userData.firstName.trim(),
                lastName: userData.lastName.trim(),
                email: userData.email.trim(),
                phone: userData.phone.trim(),
                address: userData.address.trim(),
                postalCode: userData.postalCode.trim()
            };

            const res = await adminFetch("/api/admin/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Profile updated successfully!");
            } else {
                toast.error(data.error || "Failed to update profile");
            }
        } catch (error) {
            // console.error("Error updating profile:", error);
            toast.error("Error updating profile");
        }
    };

    const handlePasswordChange = async () => {
        const newErrors = {
            currentPassword: !passwordData.currentPassword ? "Current Password is required" : "",
            newPassword: !passwordData.newPassword
                ? "New Password is required"
                : passwordData.newPassword.length < 6
                    ? "Password must be at least 6 characters"
                    : "",
            confirmPassword: !passwordData.confirmPassword
                ? "Confirm Password is required"
                : passwordData.newPassword !== passwordData.confirmPassword
                    ? "Passwords do not match"
                    : ""
        };

        if (newErrors.currentPassword || newErrors.newPassword || newErrors.confirmPassword) {
            setPasswordErrors(newErrors);
            return;
        }

        try {
            const res = await adminFetch("/api/admin/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Password updated successfully!");
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                toast.error(data.error || "Failed to update password");
            }
        } catch (error) {
            // console.error("Password update error:", error);
            toast.error("Error updating password");
        }
    };

    const navItems = [
        { id: "profile", label: "Profile", icon: <UserIcon /> },
        { id: "change-password", label: "Change Password", icon: <LockIcon /> },
    ];

    if (loading) {
        return (
            <AdminDashboardWrapper>
                <div className="flex items-center justify-center min-h-[600px] text-white">
                    Loading profile...
                </div>
            </AdminDashboardWrapper>
        );
    }

    return (
        <AdminDashboardWrapper>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">Settings</h1>
                    <p className="text-white/40 mt-1">Manage your account settings and preferences.</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-64 flex-shrink-0">
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                                        ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-lg shadow-black/20"
                                        : "text-white/50 hover:text-white hover:bg-white/[0.04] border border-transparent"
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content Area */}
                    <div className="flex-1">
                        <div className="bg-[#141414] border border-white/[0.08] rounded-2xl p-6 md:p-8 min-h-[400px]">

                            {/* --- Profile Tab --- */}
                            {activeTab === "profile" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-4 pb-6 border-b border-white/[0.08]">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/[0.1] text-2xl font-bold text-white">
                                            {userData.firstName[0]}{userData.lastName[0]}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-white">Personal Information</h2>
                                            {/* <p className="text-white/40 text-sm">Manage your basic profile information</p> */}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white/70">
                                                First Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="w-full bg-[#0a0a0a]/50 border border-white/[0.05] rounded-lg px-4 py-2.5 text-white/60 select-none transition-all">
                                                {userData.firstName}
                                            </div>
                                            {errors.firstName && (
                                                <p className="text-red-500 text-xs">{errors.firstName}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white/70">
                                                Last Name <span className="text-red-500">*</span>
                                            </label>
                                            <div className="w-full bg-[#0a0a0a]/50 border border-white/[0.05] rounded-lg px-4 py-2.5 text-white/60 select-none transition-all">
                                                {userData.lastName}
                                            </div>
                                            {errors.lastName && (
                                                <p className="text-red-500 text-xs">{errors.lastName}</p>
                                            )}
                                        </div>

                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-sm font-medium text-white/70">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <div className="w-full bg-[#0a0a0a]/50 border border-white/[0.05] rounded-lg px-4 py-2.5 text-white/60 select-none transition-all">
                                                {userData.email}
                                            </div>
                                            {errors.email && (
                                                <p className="text-red-500 text-xs">{errors.email}</p>
                                            )}
                                        </div>

                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-sm font-medium text-white/70">
                                                Mobile Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={userData.phone}
                                                onChange={handleChange}
                                                placeholder="Enter your mobile number"
                                                className={`w-full bg-[#0a0a0a] border ${errors.phone ? 'border-red-500' : 'border-white/[0.1]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors`}
                                            />
                                            {errors.phone && (
                                                <p className="text-red-500 text-xs">{errors.phone}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white/70">Date of Birth</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    name="dateOfBirth"
                                                    value={userData.dateOfBirth}
                                                    onChange={handleChange}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors [color-scheme:dark]"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white/70">Gender</label>
                                            <select
                                                name="gender"
                                                value={userData.gender}
                                                onChange={handleChange}
                                                className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none">
                                                <option value="">Select Gender</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                {/* <option value="other">Other</option> */}
                                                {/* <option value="prefer-not-to-say">Prefer not to say</option> */}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/[0.08]">
                                        <h3 className="text-lg font-semibold text-white mb-4">Address Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2 space-y-2">
                                                <label className="text-sm font-medium text-white/70">Address</label>
                                                <textarea
                                                    name="address"
                                                    rows={2}
                                                    value={userData.address}
                                                    onChange={handleChange}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors resize-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-white/70">Country</label>
                                                <select
                                                    name="country"
                                                    value={userData.country}
                                                    onChange={handleChange}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                                                >
                                                    <option value="">Select Country</option>
                                                    {apiCountries.map((country) => (
                                                        <option key={country.name} value={country.name}>
                                                            {country.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-white/70">State</label>
                                                <select
                                                    name="state"
                                                    value={userData.state}
                                                    onChange={handleChange}
                                                    disabled={!userData.country || isLoadingStates}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none disabled:opacity-50"
                                                >
                                                    <option value="">{isLoadingStates ? "Loading..." : "Select State"}</option>
                                                    {apiStates.map((state) => (
                                                        <option key={state.name} value={state.name}>
                                                            {state.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-white/70">City</label>
                                                <select
                                                    name="city"
                                                    value={userData.city}
                                                    onChange={handleChange}
                                                    disabled={!userData.state || isLoadingCities}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none disabled:opacity-50"
                                                >
                                                    <option value="">{isLoadingCities ? "Loading..." : "Select City"}</option>
                                                    {apiCities.map((city) => (
                                                        <option key={city} value={city}>
                                                            {city}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-white/70">Postal Code</label>
                                                <input
                                                    type="text"
                                                    name="postalCode"
                                                    value={userData.postalCode}
                                                    onChange={handleChange}
                                                    className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* System Info Readonly */}
                                    {/* <div className="pt-6 border-t border-white/[0.08]">
                                        <h3 className="text-lg font-semibold text-white mb-4">System Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Last Login</p>
                                                <p className="text-white font-mono">{userData.lastLogin}</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">IP Address</p>
                                                <p className="text-white font-mono">{userData.ipAddress}</p>
                                            </div>
                                        </div>
                                    </div> */}

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleSave}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                                            <EditIcon />
                                            Update
                                        </button>
                                    </div>
                                </div>
                            )}


                            {/* --- Change Password Tab --- */}
                            {activeTab === "change-password" && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Monochrome Header */}
                                    <div className="relative">
                                        <div className="flex items-center gap-4 pb-6 border-b border-white/[0.08]">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center border border-white/[0.1] text-2xl font-bold text-white">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-xl font-semibold text-white">
                                                    Change Password
                                                </h2>
                                                {/* <p className="text-white/40 text-sm">Update your password to keep your account secure</p> */}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monochrome Password Form */}
                                    {/* <div className="relative group"> */}
                                    {/* <div className="absolute -inset-[1px] bg-gradient-to-br from-white/[0.15] via-white/[0.05] to-transparent rounded-2xl blur-sm opacity-50 group-hover:opacity-70 transition-opacity"></div> */}
                                    {/* <div className="relative bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#050505] rounded-2xl border-2 border-white/[0.12] p-8 shadow-2xl"> */}
                                    <div className="space-y-6">
                                        {/* Current Password - Full Width */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-white/70">
                                                Current Password <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    placeholder="Enter your current password"
                                                    value={passwordData.currentPassword}
                                                    onChange={(e) => {
                                                        setPasswordData({ ...passwordData, currentPassword: e.target.value });
                                                        setPasswordErrors({ ...passwordErrors, currentPassword: "" });
                                                    }}
                                                    className={`w-full bg-[#0a0a0a] border ${passwordErrors.currentPassword ? 'border-red-500' : 'border-white/[0.1]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors`}
                                                />
                                                <button
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                                >
                                                    {showCurrentPassword ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                            <line x1="1" y1="1" x2="23" y2="23" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                            {passwordErrors.currentPassword && (
                                                <p className="text-red-500 text-xs">{passwordErrors.currentPassword}</p>
                                            )}
                                        </div>

                                        {/* Two Column Layout for New Password fields */}
                                        <div className="grid grid-cols-2 gap-6">
                                            {/* New Password */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-white/70">
                                                    New Password <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        placeholder="Enter your new password"
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => {
                                                            setPasswordData({ ...passwordData, newPassword: e.target.value });
                                                            setPasswordErrors({ ...passwordErrors, newPassword: "" });
                                                        }}
                                                        className={`w-full bg-[#0a0a0a] border ${passwordErrors.newPassword ? 'border-red-500' : 'border-white/[0.1]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors`}
                                                    />
                                                    <button
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                                    >
                                                        {showNewPassword ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                                <line x1="1" y1="1" x2="23" y2="23" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                                {passwordErrors.newPassword && (
                                                    <p className="text-red-500 text-xs">{passwordErrors.newPassword}</p>
                                                )}
                                            </div>

                                            {/* Confirm Password */}
                                            <div className="space-y-3">
                                                <label className="text-sm font-medium text-white/70">
                                                    Confirm New Password <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        placeholder="Confirm your new password"
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => {
                                                            setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                                                            setPasswordErrors({ ...passwordErrors, confirmPassword: "" });
                                                        }}
                                                        className={`w-full bg-[#0a0a0a] border ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-white/[0.1]'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-white/30 transition-colors`}
                                                    />
                                                    <button
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                                    >
                                                        {showConfirmPassword ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                                <line x1="1" y1="1" x2="23" y2="23" />
                                                            </svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                                {passwordErrors.confirmPassword && (
                                                    <p className="text-red-500 text-xs">{passwordErrors.confirmPassword}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-4 justify-end flex gap-4">
                                            <button
                                                onClick={handlePasswordChange}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                            >
                                                <EditIcon />
                                                Update Password
                                            </button>
                                        </div>
                                    </div>
                                    {/* </div> */}
                                    {/* </div> */}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </AdminDashboardWrapper>
    );
}
