"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ShieldAlert, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { ChangeEmailModal } from "./components/ChangeEmailModal";
import { ChangeMobileModal } from "./components/ChangeMobileModal";

interface ProfileData {
    firstName: string;
    lastName: string;
    email: string;
    isEmailVerified: number | null;
    phone: string;
    countryCode: string;
    isPhoneVerified: number | null;
    nextPhoneChangeAt?: string | null;
    nextEmailChangeAt?: string | null;
}

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<ProfileData>({
        firstName: "",
        lastName: "",
        email: "",
        isEmailVerified: null,
        phone: "",
        countryCode: "+91",
        isPhoneVerified: null,
        nextPhoneChangeAt: null,
        nextEmailChangeAt: null,
    });

    const [now, setNow] = useState(new Date());

    // Modal visibility
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [mobileModalOpen, setMobileModalOpen] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await apiFetch("/api/user/profile");
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to load profile");
                }

                setForm({
                    ...data,
                    countryCode: data.countryCode || "+91",
                    phone: data.phone || "",
                    nextPhoneChangeAt: data.nextPhoneChangeAt || null,
                    nextEmailChangeAt: data.nextEmailChangeAt || null,
                });
            } catch (err: any) {
                toast.error(err.message || "Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleEmailSuccess = (newEmail: string) => {
        setForm((prev) => ({
            ...prev,
            email: newEmail,
            isEmailVerified: 1,
            nextEmailChangeAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }));
    };

    const handleMobileSuccess = (newPhone: string, newCountryCode: string) => {
        setForm((prev) => ({
            ...prev,
            phone: newPhone,
            countryCode: newCountryCode,
            isPhoneVerified: 1,
            nextPhoneChangeAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }));
    };

    const getRemainingTimeStr = (lockedTimeStr: string | null | undefined) => {
        if (!lockedTimeStr) return "";
        const remainingMs = new Date(lockedTimeStr).getTime() - now.getTime();
        if (remainingMs <= 0) return "";
        const hours = Math.floor(remainingMs / (3600 * 1000));
        const minutes = Math.ceil((remainingMs % (3600 * 1000)) / (60 * 1000));
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    const isEmailLocked = form.nextEmailChangeAt ? new Date(form.nextEmailChangeAt) > now : false;
    const isPhoneLocked = form.nextPhoneChangeAt ? new Date(form.nextPhoneChangeAt) > now : false;

    const selectedCountryDisplay = form.countryCode
        ? `${form.countryCode} ${form.phone || "—"}`
        : form.phone || "—";

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-3xl mx-auto">
                {/* Breadcrumb */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Your Profile</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Profile Details Card */}
                        <Card className="border-border shadow-sm overflow-hidden bg-card">
                            <CardHeader className="border-b bg-muted/30 pb-6 pt-6 px-6 sm:px-8">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <CardTitle className="text-2xl font-bold tracking-tight">Profile Details</CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 sm:p-8">
                                <div className="space-y-6">
                                    {/* Name fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="font-medium text-foreground">First Name</Label>
                                            <Input
                                                value={form.firstName}
                                                disabled
                                                placeholder="First Name"
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-medium text-foreground">Last Name</Label>
                                            <Input
                                                value={form.lastName}
                                                disabled
                                                placeholder="Last Name"
                                                className="h-11"
                                            />
                                        </div>
                                    </div>

                                    {/* Email & Mobile row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Email */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Label className="font-medium text-foreground">Email Address</Label>
                                                    {form.isEmailVerified === 1 ? (
                                                        <div className="inline-flex ml-2 items-center gap-1.5 rounded bg-green-500/15 text-green-600 dark:text-green-500 text-[0.75rem] font-semibold tracking-wide uppercase">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex ml-2 items-center gap-1.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-500 text-[0.75rem] font-semibold tracking-wide uppercase">
                                                            <ShieldAlert className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                                {isEmailLocked && (
                                                    <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                                                        Locked ({getRemainingTimeStr(form.nextEmailChangeAt)} left)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="email"
                                                    value={form.email}
                                                    disabled
                                                    placeholder="Email address"
                                                    className="h-11 flex-1 bg-muted/40"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setEmailModalOpen(true)}
                                                    disabled={isEmailLocked}
                                                    className="h-11 px-4 gap-1.5 shrink-0"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Mobile */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Label className="font-medium text-foreground">Mobile Number</Label>
                                                    {form.isPhoneVerified === 1 ? (
                                                        <div className="inline-flex ml-2 items-center gap-1.5 rounded bg-green-500/15 text-green-600 dark:text-green-500 text-[0.75rem] font-semibold tracking-wide uppercase">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                        </div>
                                                    ) : (
                                                        <div className="inline-flex ml-2 items-center gap-1.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-500 text-[0.75rem] font-semibold tracking-wide uppercase">
                                                            <ShieldAlert className="w-3 h-3" />
                                                            <span>Unverified</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isPhoneLocked && (
                                                    <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                                                        Locked ({getRemainingTimeStr(form.nextPhoneChangeAt)} left)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <Input
                                                    type="tel"
                                                    value={selectedCountryDisplay}
                                                    disabled
                                                    placeholder="Mobile number"
                                                    className="h-11 flex-1 bg-muted/40"
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setMobileModalOpen(true)}
                                                    disabled={isPhoneLocked}
                                                    className="h-11 px-4 gap-1.5 shrink-0"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Change Email Modal */}
            <ChangeEmailModal
                open={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                currentEmail={form.email}
                onSuccess={handleEmailSuccess}
            />

            {/* Change Mobile Modal */}
            <ChangeMobileModal
                open={mobileModalOpen}
                onClose={() => setMobileModalOpen(false)}
                currentPhone={form.phone}
                currentCountryCode={form.countryCode}
                onSuccess={handleMobileSuccess}
            />
        </DashboardLayout>
    );
}