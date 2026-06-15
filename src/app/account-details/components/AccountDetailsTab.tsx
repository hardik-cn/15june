// src/app/account-details/components/AccountDetailsTab.tsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

interface ClientDetails {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    companyName: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
    language: string;
    emailMarketing: boolean;
    emailPreferences: {
        general: boolean;
        invoice: boolean;
        support: boolean;
        product: boolean;
        domain: boolean;
        affiliate: boolean;
    };
}

const emailPrefItems = [
    { key: "general" as const, label: "General Emails", desc: "All account related emails" },
    { key: "invoice" as const, label: "Invoice Emails", desc: "New Invoices, Reminders & Overdue Notices" },
    { key: "support" as const, label: "Support Emails", desc: "Receive a CC of all Support Ticket Communications" },
    { key: "product" as const, label: "Product Emails", desc: "Welcome Emails, Suspensions & Other Lifecycle Notifications" },
    { key: "domain" as const, label: "Domain Emails", desc: "Registration/Transfer Confirmation & Renewal Notices" },
    { key: "affiliate" as const, label: "Affiliate Emails", desc: "Receive Affiliate Notifications" },
];

export function AccountDetailsTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [details, setDetails] = useState<ClientDetails | null>(null);

    // Local editable copies for preferences
    const [emailPrefs, setEmailPrefs] = useState<ClientDetails["emailPreferences"] | null>(null);
    const [emailMarketing, setEmailMarketing] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await apiFetch("/api/whmcs/client/details");
                if (!res.ok) throw new Error("Failed to fetch account details");
                const data: ClientDetails = await res.json();
                setDetails(data);
                setEmailPrefs({ ...data.emailPreferences });
                setEmailMarketing(data.emailMarketing);
            } catch {
                toast.error("Failed to load account details");
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, []);

    const handleSavePreferences = async () => {
        if (!emailPrefs) return;

        console.log("🚀 Sending Preferences:", {
            emailMarketing,
            emailPreferences: emailPrefs,
        });

        setSaving(true);

        try {
            const res = await apiFetch("/api/whmcs/client/details", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    emailMarketing,
                    emailPreferences: emailPrefs,
                }),
            });

            const data = await res.json();

            console.log("📥 API Response:", data);

            if (!res.ok) throw new Error(data.error || "Failed");

            toast.success("Preferences saved successfully");

            // fetch again
            const fresh = await apiFetch("/api/whmcs/client/details");
            const freshData = await fresh.json();

            console.log("🔄 Fresh Data After Save:", freshData);

            setDetails(freshData);
            setEmailPrefs({ ...freshData.emailPreferences });
            setEmailMarketing(freshData.emailMarketing);

        } catch (err: any) {
            console.error("❌ Save Error:", err);
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const isDirty =
        details &&
        emailPrefs &&
        (emailMarketing !== details.emailMarketing ||
            (Object.keys(emailPrefs) as Array<keyof typeof emailPrefs>).some(
                (k) => emailPrefs[k] !== details.emailPreferences[k]
            ));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!details || !emailPrefs) {
        return (
            <div className="py-10 text-center text-muted-foreground">
                Failed to load account details.
            </div>
        );
    }

    const Field = ({
        label,
        value,
        id,
        colSpan,
    }: {
        label: string;
        value: string;
        id: string;
        colSpan?: boolean;
    }) => (
        <div className={`space-y-1.5 ${colSpan ? "col-span-2" : ""}`}>
            <Label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
            </Label>
            <Input
                id={id}
                value={value || "—"}
                disabled
                className="bg-muted/40 border-border/60 text-foreground cursor-not-allowed h-10"
            />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Personal Information */}
            <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Personal Information</h2>
                <Card className="border-border/60 bg-card">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Field id="acc-firstName" label="First Name" value={details.firstName} />
                            <Field id="acc-lastName" label="Last Name" value={details.lastName} />
                            <Field id="acc-email" label="Email Address" value={details.email} />
                            <Field id="acc-phone" label="Phone Number" value={details.phone} />
                            <Field id="acc-language" label="Language" value={details.language} />
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Billing Address */}
            <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Billing Address</h2>
                <Card className="border-border/60 bg-card">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-4">
                            <Field id="acc-company" label="Company Name" value={details.companyName} />
                            <Field id="acc-address1" label="Address 1" value={details.address1} />
                            <Field id="acc-address2" label="Address 2" value={details.address2} />
                            <Field id="acc-city" label="City" value={details.city} />
                            <Field id="acc-country" label="Country" value={details.country} />
                            <div className="grid grid-cols-2 gap-3 col-span-2">
                                <Field id="acc-state" label="State / Region" value={details.state} />
                                <Field id="acc-postcode" label="Zip Code" value={details.postcode} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Email Preferences */}
            <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Email Preferences</h2>
                <Card className="border-border/60 bg-card">
                    <CardContent className="pt-6 space-y-3">
                        {emailPrefItems.map(({ key, label, desc }) => (
                            <button
                                key={key}
                                type="button"
                                id={`pref-${key}`}
                                onClick={() =>
                                    setEmailPrefs((p) => p ? { ...p, [key]: !p[key] } : p)
                                }
                                className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors text-left"
                            >
                                <div
                                    className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${emailPrefs[key]
                                        ? "bg-primary border-primary"
                                        : "bg-transparent border-border"
                                        }`}
                                >
                                    {emailPrefs[key] && (
                                        <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{label}</p>
                                    <p className="text-xs text-muted-foreground">{desc}</p>
                                </div>
                            </button>
                        ))}
                    </CardContent>
                </Card>
            </section>

            {/* Mailing List */}
            <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Join our mailing list</h2>
                <Card className="border-border/60 bg-card">
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground mb-4">
                            We would like to send you occasional news, information and special offers by email.
                        </p>
                        <button
                            type="button"
                            id="mailing-list-toggle"
                            onClick={() => setEmailMarketing((v) => !v)}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors text-left"
                        >
                            <span className="text-sm font-medium text-foreground">Receive Emails</span>
                            <div
                                className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${emailMarketing ? "bg-green-500" : "bg-muted"
                                    }`}
                            >
                                <span
                                    className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform ${emailMarketing ? "translate-x-6" : "translate-x-1"
                                        }`}
                                />
                            </div>
                        </button>
                    </CardContent>
                </Card>
            </section>

            {/* Save Button */}
            <div className="flex items-center gap-3">
                <Button
                    id="save-preferences-btn"
                    onClick={handleSavePreferences}
                    disabled={saving || !isDirty}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving…
                        </>
                    ) : (
                        <>
                            Save Changes
                        </>
                    )}
                </Button>
                {isDirty && (
                    <Button
                        id="reset-preferences-btn"
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setEmailPrefs({ ...details.emailPreferences });
                            setEmailMarketing(details.emailMarketing);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Reset
                    </Button>
                )}
            </div>
        </div>
    );
}
