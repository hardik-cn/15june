// src/app/account-details/components/ContactsTab.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Loader2, ChevronDown, UserPlus, Plus, X, Save, PencilLine } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

// ─────────────────────────────────────────────────────────────────────────────
// Country codes
// ─────────────────────────────────────────────────────────────────────────────
const countryCodes = [
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+1", country: "United States", flag: "🇺🇸" },
    { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
    { code: "+81", country: "Japan", flag: "🇯🇵" },
    { code: "+86", country: "China", flag: "🇨🇳" },
    { code: "+82", country: "South Korea", flag: "🇰🇷" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+55", country: "Brazil", flag: "🇧🇷" },
    { code: "+52", country: "Mexico", flag: "🇲🇽" },
    { code: "+7", country: "Russia", flag: "🇷🇺" },
    { code: "+39", country: "Italy", flag: "🇮🇹" },
    { code: "+34", country: "Spain", flag: "🇪🇸" },
    { code: "+31", country: "Netherlands", flag: "🇳🇱" },
    { code: "+46", country: "Sweden", flag: "🇸🇪" },
    { code: "+47", country: "Norway", flag: "🇳🇴" },
    { code: "+45", country: "Denmark", flag: "🇩🇰" },
    { code: "+358", country: "Finland", flag: "🇫🇮" },
    { code: "+48", country: "Poland", flag: "🇵🇱" },
    { code: "+41", country: "Switzerland", flag: "🇨🇭" },
    { code: "+43", country: "Austria", flag: "🇦🇹" },
    { code: "+32", country: "Belgium", flag: "🇧🇪" },
    { code: "+351", country: "Portugal", flag: "🇵🇹" },
    { code: "+30", country: "Greece", flag: "🇬🇷" },
    { code: "+353", country: "Ireland", flag: "🇮🇪" },
    { code: "+64", country: "New Zealand", flag: "🇳🇿" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+66", country: "Thailand", flag: "🇹🇭" },
    { code: "+62", country: "Indonesia", flag: "🇮🇩" },
    { code: "+63", country: "Philippines", flag: "🇵🇭" },
    { code: "+84", country: "Vietnam", flag: "🇻🇳" },
    { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
    { code: "+92", country: "Pakistan", flag: "🇵🇰" },
    { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
    { code: "+977", country: "Nepal", flag: "🇳🇵" },
    { code: "+27", country: "South Africa", flag: "🇿🇦" },
    { code: "+20", country: "Egypt", flag: "🇪🇬" },
    { code: "+234", country: "Nigeria", flag: "🇳🇬" },
    { code: "+254", country: "Kenya", flag: "🇰🇪" },
    { code: "+972", country: "Israel", flag: "🇮🇱" },
    { code: "+90", country: "Turkey", flag: "🇹🇷" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Contact {
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
    phoneCountryCode: string;
    emailPreferences: {
        general: boolean;
        invoice: boolean;
        support: boolean;
        product: boolean;
        domain: boolean;
        affiliate: boolean;
    };
}

type FormData = {
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
    phoneCountryCode: string;
    generalEmails: boolean;
    invoiceEmails: boolean;
    supportEmails: boolean;
    productEmails: boolean;
    domainEmails: boolean;
    affiliateEmails: boolean;
};

const BLANK_FORM: FormData = {
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
    country: "",
    phone: "",
    phoneCountryCode: "+91",
    generalEmails: false,
    invoiceEmails: false,
    supportEmails: false,
    productEmails: false,
    domainEmails: false,
    affiliateEmails: false,
};

const contactPrefItems = [
    { key: "generalEmails" as const, label: "General Emails", desc: "General Announcements & Password Reminders" },
    { key: "invoiceEmails" as const, label: "Invoice Emails", desc: "Invoices & Billing Reminders" },
    { key: "supportEmails" as const, label: "Support Emails", desc: "Receive a copy of all support ticket communications" },
    { key: "productEmails" as const, label: "Product Emails", desc: "Order Details, Welcome Emails, etc." },
    { key: "domainEmails" as const, label: "Domain Emails", desc: "Renewal Notices, Registration Confirmations, etc." },
    { key: "affiliateEmails" as const, label: "Affiliate Emails", desc: "Receive Affiliate Notifications" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function contactToForm(c: Contact): FormData {
    // Parse stored phone — could be "+91 9876543210" or raw number
    let phoneCountryCode = "+91";
    let phone = c.phone ?? "";
    const match = phone.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
        const found = countryCodes.find((cc) => cc.code === match[1]);
        if (found) {
            phoneCountryCode = match[1];
            phone = match[2];
        }
    }

    return {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        companyName: c.companyName,
        address1: c.address1,
        address2: c.address2,
        city: c.city,
        state: c.state,
        postcode: c.postcode,
        country: c.country,
        phone,
        phoneCountryCode,
        generalEmails: c.emailPreferences.general,
        invoiceEmails: c.emailPreferences.invoice,
        supportEmails: c.emailPreferences.support,
        productEmails: c.emailPreferences.product,
        domainEmails: c.emailPreferences.domain,
        affiliateEmails: c.emailPreferences.affiliate,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────
function validateContactForm(form: FormData): string | null {
    if (!form.firstName.trim()) return "First name is required.";
    if (form.firstName.trim().length < 2) return "First name must be at least 2 characters.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (form.lastName.trim().length < 2) return "Last name must be at least 2 characters.";
    if (!form.email.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Please enter a valid email address.";
    if (form.phone.trim() && !/^\d{6,15}$/.test(form.phone.trim())) {
        return "Phone number must be 6-15 digits (numbers only).";
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FormField component
// ─────────────────────────────────────────────────────────────────────────────
interface FormFieldProps {
    label: string;
    id: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    required?: boolean;
}

function FormField({ label, id, value, onChange, type = "text", required }: FormFieldProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="bg-background border-border/60 h-10 focus:ring-primary/40"
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhoneField — country code dropdown + phone input
// ─────────────────────────────────────────────────────────────────────────────
interface PhoneFieldProps {
    idPrefix: string;
    phone: string;
    phoneCountryCode: string;
    onPhoneChange: (v: string) => void;
    onCountryCodeChange: (v: string) => void;
}

function PhoneField({ idPrefix, phone, phoneCountryCode, onPhoneChange, onCountryCodeChange }: PhoneFieldProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selected = countryCodes.find((c) => c.code === phoneCountryCode) ?? countryCodes[0];

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-phone`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Phone Number
            </Label>
            <div className="flex gap-2" ref={containerRef}>
                {/* Country code trigger */}
                <div className="relative">
                    <button
                        type="button"
                        id={`${idPrefix}-phone-code`}
                        onClick={() => setOpen((p) => !p)}
                        className="flex items-center gap-1.5 px-2.5 h-10 bg-background border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all min-w-[90px] text-sm"
                    >
                        <span className="text-base">{selected.flag}</span>
                        <span className="font-medium">{selected.code}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                    </button>
                    {open && (
                        <div className="absolute top-full left-0 mt-1 w-64 max-h-56 overflow-y-auto bg-card border border-border/60 rounded-md shadow-xl z-50">
                            {countryCodes.map((c) => (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                        onCountryCodeChange(c.code);
                                        setOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left ${c.code === phoneCountryCode ? "bg-muted/40 font-medium" : ""}`}
                                >
                                    <span className="text-base">{c.flag}</span>
                                    <span className="text-foreground truncate">{c.country}</span>
                                    <span className="text-muted-foreground ml-auto shrink-0">{c.code}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {/* Phone number input */}
                <Input
                    id={`${idPrefix}-phone`}
                    type="tel"
                    value={phone}
                    onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, 15))}
                    placeholder="Enter phone number"
                    className="flex-1 bg-background border-border/60 h-10 focus:ring-primary/40"
                />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PrefToggle — also outside to avoid re-mount issues
// ─────────────────────────────────────────────────────────────────────────────
interface PrefToggleProps {
    id: string;
    label: string;
    desc: string;
    checked: boolean;
    onToggle: () => void;
}

function PrefToggle({ id, label, desc, checked, onToggle }: PrefToggleProps) {
    return (
        <button
            type="button"
            id={id}
            onClick={onToggle}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors text-left"
        >
            <div
                className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${checked ? "bg-primary border-primary" : "bg-transparent border-border"}`}
            >
                {checked && (
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
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function ContactsTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
    const [form, setForm] = useState<FormData>(BLANK_FORM);
    const [originalForm, setOriginalForm] = useState<FormData | null>(null);

    const fetchContacts = async () => {
        try {
            const res = await apiFetch("/api/whmcs/client/contacts");
            if (!res.ok) throw new Error("Failed to fetch contacts");

            const data = await res.json();
            const fetched: Contact[] = data.contacts ?? [];

            setContacts(fetched);
            setSelectedId((prev) => {
                // If already selected, keep it
                if (prev === "new") return prev;
                if (typeof prev === "number") {
                    const stillExists = fetched.find((c) => c.id === prev);
                    if (stillExists) {
                        const f = contactToForm(stillExists);
                        setForm(f);
                        setOriginalForm(f);
                        return prev;
                    }
                }
                if (fetched.length > 0) {
                    const first = fetched[0];
                    const f = contactToForm(first);
                    setForm(f);
                    setOriginalForm(f);
                    return first.id;
                }
                return "new";
            });

        } catch {
            toast.error("Failed to load contacts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectChange = (raw: string) => {
        if (raw === "new") {
            setSelectedId("new");
            setForm(BLANK_FORM);
            setOriginalForm(null);
        } else if (raw === "") {
            setSelectedId(null);
            setForm(BLANK_FORM);
            setOriginalForm(null);
        } else {
            const id = Number(raw);
            const contact = contacts.find((c) => c.id === id);
            if (contact) {
                const f = contactToForm(contact);
                setSelectedId(id);
                setForm(f);
                setOriginalForm(f);
            }
        }
    };

    // Helpers — use functional updater to avoid stale-closure issues
    const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const togglePref = (key: keyof FormData) =>
        setForm((prev) => ({ ...prev, [key]: !prev[key] }));

    // Build phone string to send to backend: "+91 9876543210"
    const buildPhone = () => (form.phone.trim() ? `${form.phoneCountryCode} ${form.phone.trim()}` : "");

    // Add new contact
    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        const error = validateContactForm(form);
        if (error) {
            toast.error(error);
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, phone: buildPhone() };
            const res = await apiFetch("/api/whmcs/client/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add contact");

            toast.success("Contact added successfully");
            setForm(BLANK_FORM);
            setOriginalForm(null);
            setSelectedId(null);
            setLoading(true);
            await fetchContacts();
        } catch (err: any) {
            toast.error(err.message || "Failed to add contact");
        } finally {
            setSaving(false);
        }
    };

    // Update existing contact
    const handleUpdateContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof selectedId !== "number") return;
        const error = validateContactForm(form);
        if (error) {
            toast.error(error);
            return;
        }
        setSaving(true);
        try {
            const payload = { contactId: selectedId, ...form, phone: buildPhone() };
            const res = await apiFetch("/api/whmcs/client/contacts", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update contact");

            toast.success("Contact updated successfully");
            setOriginalForm({ ...form });

            setContacts((prev) =>
                prev.map((c) =>
                    c.id === selectedId
                        ? {
                            ...c,
                            ...form,
                            phone: buildPhone(),
                            emailPreferences: {
                                general: form.generalEmails,
                                invoice: form.invoiceEmails,
                                support: form.supportEmails,
                                product: form.productEmails,
                                domain: form.domainEmails,
                                affiliate: form.affiliateEmails,
                            },
                        }
                        : c
                )
            );
            setLoading(true);
            await fetchContacts();
        } catch (err: any) {
            toast.error(err.message || "Failed to update contact");
        } finally {
            setSaving(false);
        }
    };

    // Delete existing contact
    const handleDeleteContact = async () => {
        if (typeof selectedId !== "number") return;

        const confirmDelete = confirm("Are you sure you want to delete this contact?");
        if (!confirmDelete) return;

        setSaving(true);

        try {
            const res = await apiFetch("/api/whmcs/client/contacts", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contactId: selectedId }),
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to delete");

            toast.success("Contact deleted successfully");

            setSelectedId(null);
            setForm(BLANK_FORM);
            setOriginalForm(null);

            setLoading(true);
            await fetchContacts();

        } catch (err: any) {
            toast.error(err.message || "Failed to delete contact");
        } finally {
            setSaving(false);
        }
    };

    const isDirty =
        originalForm !== null &&
        (Object.keys(form) as Array<keyof FormData>).some(
            (k) => (form[k] as any) !== (originalForm[k] as any)
        );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const isExistingSelected = typeof selectedId === "number";
    const isNewSelected = selectedId === "new";

    return (
        <div className="space-y-6">
            {/* Choose Contact */}
            <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">Choose Contact</h2>
                <Card className="border-border/60 bg-card">
                    <CardContent className="pt-6">
                        <div className="relative max-w-sm">
                            <select
                                id="contact-selector"
                                className="w-full appearance-none bg-muted/40 border border-border/60 rounded-md px-3 py-2.5 text-sm text-foreground pr-10 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                                value={selectedId === "new" ? "new" : selectedId ?? ""}
                                onChange={(e) => handleSelectChange(e.target.value)}
                            >
                                <option value="">— Select a contact —</option>
                                <option value="new">Add New Contact</option>
                                {contacts.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.firstName} {c.lastName}{c.email ? ` (${c.email})` : ""}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* === ADD NEW CONTACT FORM === */}
            {isNewSelected && (
                <form onSubmit={handleAddContact} className="space-y-6">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Plus className="h-5 w-5 text-primary" />
                                New Contact Details
                            </h2>
                            <button
                                type="button"
                                onClick={() => { setSelectedId(null); setForm(BLANK_FORM); }}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <Card className="border-border/60 bg-card">
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField id="new-firstName" label="First Name" value={form.firstName} onChange={(v) => setField("firstName", v)} />
                                    <FormField id="new-lastName" label="Last Name" value={form.lastName} onChange={(v) => setField("lastName", v)} />
                                    <FormField id="new-email" label="Email Address" type="email" value={form.email} onChange={(v) => setField("email", v)} />
                                    {/* Phone with country code */}
                                    <PhoneField
                                        idPrefix="new"
                                        phone={form.phone}
                                        phoneCountryCode={form.phoneCountryCode}
                                        onPhoneChange={(v) => setField("phone", v)}
                                        onCountryCodeChange={(v) => setField("phoneCountryCode", v)}
                                    />
                                    <FormField id="new-company" label="Company Name" value={form.companyName} onChange={(v) => setField("companyName", v)} />
                                    <FormField id="new-address1" label="Address 1" value={form.address1} onChange={(v) => setField("address1", v)} />
                                    <FormField id="new-address2" label="Address 2" value={form.address2} onChange={(v) => setField("address2", v)} />
                                    <FormField id="new-city" label="City" value={form.city} onChange={(v) => setField("city", v)} />
                                    <div className="grid grid-cols-3 gap-3 col-span-2">
                                        <FormField id="new-country" label="Country" value={form.country} onChange={(v) => setField("country", v)} />
                                        <FormField id="new-state" label="State / Region" value={form.state} onChange={(v) => setField("state", v)} />
                                        <FormField id="new-postcode" label="Zip Code" value={form.postcode} onChange={(v) => setField("postcode", v)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Email Preferences</h2>
                        <Card className="border-border/60 bg-card">
                            <CardContent className="pt-6 space-y-3">
                                {contactPrefItems.map(({ key, label, desc }) => (
                                    <PrefToggle
                                        key={key}
                                        id={`new-pref-${key}`}
                                        label={label}
                                        desc={desc}
                                        checked={form[key] as boolean}
                                        onToggle={() => togglePref(key)}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    </section>

                    <div className="flex gap-3">
                        <Button type="submit" id="add-contact-submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><UserPlus className="h-4 w-4 mr-2" />Save Contact</>}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => { setSelectedId(null); setForm(BLANK_FORM); }} className="text-muted-foreground hover:text-foreground">
                            Cancel
                        </Button>
                    </div>
                </form>
            )}

            {/* === EDIT EXISTING CONTACT === */}
            {isExistingSelected && (
                <form onSubmit={handleUpdateContact} className="space-y-6">
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <PencilLine className="h-5 w-5 text-primary" />
                                Contact Details
                            </h2>
                        </div>
                        <Card className="border-border/60 bg-card">
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField id="con-firstName" label="First Name" value={form.firstName} onChange={(v) => setField("firstName", v)} required />
                                    <FormField id="con-lastName" label="Last Name" value={form.lastName} onChange={(v) => setField("lastName", v)} required />
                                    <FormField id="con-email" label="Email Address" type="email" value={form.email} onChange={(v) => setField("email", v)} required />
                                    {/* Phone with country code */}
                                    <PhoneField
                                        idPrefix="con"
                                        phone={form.phone}
                                        phoneCountryCode={form.phoneCountryCode}
                                        onPhoneChange={(v) => setField("phone", v)}
                                        onCountryCodeChange={(v) => setField("phoneCountryCode", v)}
                                    />
                                    <FormField id="con-company" label="Company Name" value={form.companyName} onChange={(v) => setField("companyName", v)} />
                                    <FormField id="con-address1" label="Address 1" value={form.address1} onChange={(v) => setField("address1", v)} />
                                    <FormField id="con-address2" label="Address 2" value={form.address2} onChange={(v) => setField("address2", v)} />
                                    <FormField id="con-city" label="City" value={form.city} onChange={(v) => setField("city", v)} />
                                    <div className="grid grid-cols-3 gap-3 col-span-2">
                                        <FormField id="con-state" label="State / Region" value={form.state} onChange={(v) => setField("state", v)} />
                                        <FormField id="con-country" label="Country" value={form.country} onChange={(v) => setField("country", v)} />
                                        <FormField id="con-postcode" label="Zip Code" value={form.postcode} onChange={(v) => setField("postcode", v)} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-foreground mb-4">Email Preferences</h2>
                        <Card className="border-border/60 bg-card">
                            <CardContent className="pt-6 space-y-3">
                                {contactPrefItems.map(({ key, label, desc }) => (
                                    <PrefToggle
                                        key={key}
                                        id={`con-pref-${key}`}
                                        label={label}
                                        desc={desc}
                                        checked={form[key] as boolean}
                                        onToggle={() => togglePref(key)}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    </section>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                type="submit"
                                id="update-contact-submit"
                                disabled={saving || !isDirty}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <>Save Changes</>}
                            </Button>
                            {isDirty && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    id="reset-contact-btn"
                                    onClick={() => originalForm && setForm({ ...originalForm })}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    Reset
                                </Button>
                            )}
                        </div>
                        <Button
                            type="button"
                            id="delete-contact-submit"
                            onClick={handleDeleteContact}
                            disabled={saving || typeof selectedId !== "number"}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                <>Delete Contact</>
                            )}
                        </Button>
                    </div>
                </form>
            )}

            {/* Empty state */}
            {contacts.length === 0 && selectedId === null && (
                <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
                    <UserPlus className="h-10 w-10 opacity-40" />
                    <p className="text-sm">No contacts found. Use the dropdown above to add a new contact.</p>
                </div>
            )}
        </div>
    );
}