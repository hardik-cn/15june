// src/app/security-settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";
import { Shield, MessageSquare, Mail, Smartphone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/apiFetch";

export default function SecuritySettingsPage() {
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [appEnabled, setAppEnabled] = useState(false);
    const [loading, setLoading] = useState(false);

    const fetchTwoFactorSettings = async () => {

        try {

            const response = await apiFetch(
                "/api/auth/2fa/setup"
            );

            if (!response.ok) {
                throw new Error("Failed to load settings");
            }

            const data = await response.json();

            setSmsEnabled(data.smsEnabled);
            setEmailEnabled(data.emailEnabled);
            setAppEnabled(data.appEnabled);

        } catch (error) {

            console.log(error);

        }

    };

    useEffect(() => {
        fetchTwoFactorSettings();
    }, []);

    const handleSave = async () => {

        setLoading(true);

        try {

            const response = await apiFetch(
                "/api/auth/2fa/setup",
                {
                    method: "POST",
                    body: JSON.stringify({
                        smsEnabled,
                        emailEnabled,
                        appEnabled
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            if (data.qrCode) {

                // Open QR modal here

                console.log(data.qrCode);

            }

            toast.success(
                "Two-factor authentication updated"
            );

        } catch (error: any) {

            toast.error(
                error.message || "Failed to save settings"
            );

        } finally {

            setLoading(false);

        }

    };

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
                            <BreadcrumbPage>Security Settings</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* 2FA Card */}
                <Card className="border-border shadow-sm overflow-hidden bg-card">
                    <CardHeader className="border-b bg-muted/30 pb-6 pt-6 px-6 sm:px-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full text-primary">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">Two-Factor Authentication</CardTitle>
                                <CardDescription className="text-sm mt-1">
                                    Add an extra layer of security to your account by enabling two-factor authentication
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-8 space-y-6">
                        {/* SMS Option */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">SMS</h3>
                                    <p className="text-sm text-muted-foreground">Receive verification codes via text message</p>
                                </div>
                            </div>
                            <Switch
                                disabled={loading}
                                checked={smsEnabled}
                                onCheckedChange={setSmsEnabled}
                            />
                        </div>

                        {/* Email Option */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Email</h3>
                                    <p className="text-sm text-muted-foreground">Receive verification codes via email</p>
                                </div>
                            </div>
                            <Switch
                                disabled={loading}
                                checked={emailEnabled}
                                onCheckedChange={setEmailEnabled}
                            />
                        </div>

                        {/* App Authenticator Option */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">App Authenticator</h3>
                                    <p className="text-sm text-muted-foreground">Use an authenticator app like Google Authenticator</p>
                                </div>
                            </div>
                            <Switch
                                disabled={loading}
                                checked={appEnabled}
                                onCheckedChange={setAppEnabled}
                            />
                        </div>

                        {/* Save Button */}
                        <div className="pt-6 border-t border-border/50">
                            <Button
                                onClick={handleSave}
                                disabled={loading}
                                className="min-w-[140px] h-11"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
