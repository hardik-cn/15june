// src/app/change-password/page.tsx
"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
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
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/app/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ShieldCheck, KeyRound, Copy, Plus, Check } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export default function ChangePasswordPage() {
    const [existingPassword, setExistingPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Modal state
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [generateLength, setGenerateLength] = useState<number>(12);
    const [generatedPwd, setGeneratedPwd] = useState("");
    const [copied, setCopied] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters long");
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch("/api/whmcs/change-password", {
                method: "POST",
                body: JSON.stringify({
                    existingPassword,
                    newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to change password");
            }

            toast.success("Password changed successfully");
            setExistingPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            toast.error(err.message || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    const doGeneratePassword = (length: number) => {
        const actualLength = Math.max(8, length);
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
        let password = "";

        // Ensure at least one uppercase, lowercase, number, and symbol
        password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
        password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
        password += "0123456789"[Math.floor(Math.random() * 10)];
        password += "!@#$%^&*"[Math.floor(Math.random() * 8)];

        // Fill the rest
        for (let i = 0; i < actualLength - 4; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }

        // Shuffle the password
        password = password.split('').sort(() => 0.5 - Math.random()).join('');
        setGeneratedPwd(password);
        setCopied(false);
    };

    // Generate on modal open
    useEffect(() => {
        if (isGenerateModalOpen && !generatedPwd) {
            doGeneratePassword(generateLength);
        }
    }, [isGenerateModalOpen, generatedPwd, generateLength]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPwd);
        setCopied(true);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInsert = () => {
        navigator.clipboard.writeText(generatedPwd);
        setNewPassword(generatedPwd);
        setConfirmPassword(generatedPwd);
        setIsGenerateModalOpen(false);
        toast.success("Password applied");
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
                            <BreadcrumbPage>Change Password</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Form Card */}
                <Card className="border-border shadow-sm overflow-hidden bg-card">
                    <CardHeader className="border-b bg-muted/30 pb-6 pt-6 px-6 sm:px-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-full text-primary">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">Change Password</CardTitle>
                                <CardDescription className="text-sm mt-1">
                                    Update your account password to stay secure. Use a strong, unique password.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-8">
                        <form onSubmit={handleSave} className="space-y-6">

                            {/* Existing Password */}
                            <div className="space-y-2">
                                <Label className="font-medium text-foreground">
                                    Current Password
                                </Label>
                                <Input
                                    type="password"
                                    placeholder="Enter your current password"
                                    value={existingPassword}
                                    onChange={(e) => setExistingPassword(e.target.value)}
                                    required
                                    className="h-11 max-w-xl"
                                />
                            </div>

                            {/* New Password */}
                            <div className="space-y-2">
                                <Label className="font-medium text-foreground">
                                    New Password
                                </Label>
                                <div className="flex max-w-xl gap-2">
                                    <Input
                                        type="password"
                                        placeholder="Enter your new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        className="flex-1 h-11"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsGenerateModalOpen(true)}
                                        className="shrink-0 h-11"
                                    >
                                        <KeyRound className="w-4 h-4" />
                                        Generate
                                    </Button>
                                </div>
                                {/* Simple Strength Meter */}
                                <div className="h-1.5 max-w-xl bg-muted rounded-full overflow-hidden mt-2">
                                    {newPassword.length > 0 && (
                                        <div
                                            className={`h-full transition-all duration-300 ${newPassword.length < 8 ? 'bg-destructive' :
                                                newPassword.length < 12 ? 'bg-amber-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${Math.min(newPassword.length * 8.33, 100)}%` }}
                                        />
                                    )}
                                </div>
                                <p className="text-[0.8rem] text-muted-foreground mt-1 max-w-xl">
                                    Password must be at least 8 characters long.
                                </p>
                            </div>

                            {/* Confirm New Password */}
                            <div className="space-y-2">
                                <Label className="font-medium text-foreground">
                                    Confirm New Password
                                </Label>
                                <Input
                                    type="password"
                                    placeholder="Confirm your new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="h-11 max-w-xl"
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="submit"
                                        // disabled={loading || newPassword !== confirmPassword || newPassword.length < 8}
                                        className="min-w-[140px] h-11"
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading ? "Saving..." : "Save Changes"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setExistingPassword("");
                                            setNewPassword("");
                                            setConfirmPassword("");
                                        }}
                                        disabled={loading}
                                        className="h-11"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>

                        </form>
                    </CardContent>
                </Card>

                {/* Generate Password Modal */}
                <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Generate Password</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5 py-4">
                            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
                                <Label className="text-right text-muted-foreground font-medium">Password Length</Label>
                                <Input
                                    type="number"
                                    min={8}
                                    max={64}
                                    value={generateLength || ""}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setGenerateLength(isNaN(val) ? 0 : val);
                                    }}
                                    onBlur={() => {
                                        if (generateLength < 8) {
                                            setGenerateLength(8);
                                            doGeneratePassword(8);
                                        } else {
                                            doGeneratePassword(generateLength);
                                        }
                                    }}
                                    className="w-24 bg-background"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] items-start gap-4">
                                <Label className="text-right text-muted-foreground font-medium pt-3">Generated Password</Label>
                                <div className="space-y-3">
                                    <Input
                                        type="text"
                                        value={generatedPwd}
                                        readOnly
                                        className="font-mono bg-muted/40 text-sm"
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => doGeneratePassword(Math.max(8, generateLength))}
                                            className="h-9"
                                        >
                                            <Plus className="w-4 h-4 mr-1.5" />
                                            Generate new password
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopy}
                                            className="h-9"
                                        >
                                            {copied ? <Check className="w-4 h-4 mr-1.5 text-green-500" /> : <Copy className="w-4 h-4 mr-1.5" />}
                                            {copied ? "Copied" : "Copy"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-between border-t border-border pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsGenerateModalOpen(false)}
                            >
                                Close
                            </Button>
                            <Button onClick={handleInsert}>
                                Copy to clipboard and Insert
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
