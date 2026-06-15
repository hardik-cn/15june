"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Globe, RotateCcw, Server, Lock, Puzzle, User,
  Key, RefreshCcw, ArrowLeft, CheckCircle, XCircle,
  Copy, ShieldCheck, Calendar, CreditCard, Loader2,
  ChevronRight, AlertTriangle,
} from "lucide-react";

interface DomainDetail {
  id: number;
  domain: string;
  status: string;
  expiryDate: string;
  nextDueDate: string;
  registrationDate: string;
  autoRenew: boolean;
  idProtect: boolean;
  registrar: string;
  recurringAmount: string;
  firstPaymentAmount: string;
  paymentMethod: string;
  billingCycle: string;
  nameservers: string[];
  registrarLock: boolean;
  whoisInfo: any;
}

const TABS = [
  { id: "overview", label: "Overview", icon: Globe },
  { id: "autorenew", label: "Auto Renew", icon: RotateCcw },
  { id: "nameservers", label: "Nameservers", icon: Server },
  { id: "lock", label: "Registrar Lock", icon: Lock },
  { id: "addons", label: "Addons", icon: Puzzle },
  { id: "contact", label: "Contact Information", icon: User },
  { id: "epp", label: "Get EPP Code", icon: Key },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Expired: "bg-red-500/10 text-red-400 border-red-500/20",
    Pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Cancelled: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${map[status] ?? map["Pending"]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function DomainManagePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [domain, setDomain] = useState<DomainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "overview");
  const [busy, setBusy] = useState(false);

  // Nameservers state
  const [ns, setNs] = useState<string[]>(["", "", "", ""]);

  // EPP state
  const [eppCode, setEppCode] = useState<string | null>(null);

  const fetchDomain = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/whmcs/domains/details?id=${id}`);
      const data = await res.json();
      if (data.domain) {
        setDomain(data.domain);
        setNs(
          data.domain.nameservers?.length
            ? [...data.domain.nameservers, "", "", ""].slice(0, 4)
            : ["", "", "", ""]
        );
      } else {
        toast.error(data.error ?? "Domain not found");
      }
    } catch {
      toast.error("Failed to load domain details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDomain(); }, [fetchDomain]);

  const handleToggleAutoRenew = async () => {
    setBusy(true);
    try {
      await apiFetch("/api/whmcs/domains/toggle-autorenew", {
        method: "POST",
        body: JSON.stringify({ domainId: id }),
      });
      toast.success("Auto-renew updated");
      fetchDomain();
    } catch { toast.error("Failed to update auto-renew"); }
    finally { setBusy(false); }
  };

  const handleToggleLock = async () => {
    if (!domain) return;
    setBusy(true);
    try {
      await apiFetch("/api/whmcs/domains/toggle-lock", {
        method: "POST",
        body: JSON.stringify({ domainId: id, lock: !domain.registrarLock }),
      });
      toast.success(`Registrar lock ${!domain.registrarLock ? "enabled" : "disabled"}`);
      fetchDomain();
    } catch { toast.error("Failed to update registrar lock"); }
    finally { setBusy(false); }
  };

  const handleUpdateNameservers = async () => {
    const filled = ns.filter(Boolean);
    if (filled.length < 2) { toast.error("Please provide at least 2 nameservers"); return; }
    setBusy(true);
    try {
      await apiFetch("/api/whmcs/domains/update-nameservers", {
        method: "POST",
        body: JSON.stringify({ domainId: id, nameservers: filled }),
      });
      toast.success("Nameservers updated");
      fetchDomain();
    } catch { toast.error("Failed to update nameservers"); }
    finally { setBusy(false); }
  };

  const handleGetEpp = async () => {
    setBusy(true);
    try {
      const res = await apiFetch("/api/whmcs/domains/epp-code", {
        method: "POST",
        body: JSON.stringify({ domainId: id }),
      });
      const data = await res.json();
      if (data.eppCode) {
        setEppCode(data.eppCode);
        toast.success("EPP code retrieved — check your email or copy from below");
      } else {
        toast.success("EPP code sent to your registered email address");
      }
    } catch { toast.error("Failed to request EPP code"); }
    finally { setBusy(false); }
  };

  const handleRenew = async () => {
    setBusy(true);
    try {
      const res = await apiFetch("/api/whmcs/domains/renew", {
        method: "POST",
        body: JSON.stringify({ domainId: id, years: 1 }),
      });
      const data = await res.json();
      if (data.success) toast.success("Renewal order placed successfully");
      else toast.error(data.error ?? "Failed to renew domain");
    } catch { toast.error("Failed to renew domain"); }
    finally { setBusy(false); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading domain details…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!domain) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-400" />
          <p className="text-lg font-semibold">Domain not found</p>
          <Button variant="outline" asChild>
            <Link href="/domains"><ArrowLeft className="w-4 h-4 mr-2" />Back to Domains</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/domains" className="hover:text-foreground transition-colors">My Domains</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{domain.domain}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Managing {domain.domain}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={domain.status} />
                {domain.registrarLock && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-violet-500/10 text-white/60 border-violet-500/20">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchDomain()}>
                <RefreshCcw className="w-4 h-4" />Refresh
              </Button>
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90" onClick={handleRenew} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Renew Domain
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Sidebar nav */}
          <div className="xl:col-span-1 space-y-6">

            {/* Domain Hero Card */}
            <div className="rounded-2xl overflow-hidden border border-neutral-900">
              <div className="bg-gradient-to-br from-neutral-900 via-black to-neutral-900 p-8 flex flex-col items-center justify-center gap-3 min-h-[160px]">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Globe className="w-7 h-7 text-white" />
                </div>
                <p className="text-white font-semibold text-lg text-center break-all">{domain.domain}</p>
              </div>
            </div>

            {/* Manage Menu */}
            <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="px-4 py-3 border-b">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Manage</p>
              </div>
              <nav className="p-2 space-y-0.5">
                {TABS.map(({ id: tid, label, icon: Icon }) => (
                  <button
                    key={tid}
                    onClick={() => setActiveTab(tid)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${activeTab === tid
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </nav>
              <div className="px-4 py-3 border-t">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Actions</p>
                <div className="space-y-0.5">
                  {[
                    { label: "Renew Domain", action: handleRenew },
                    { label: "Register New Domain", href: "/domains/register" },
                    { label: "Transfer a Domain", href: "/domains/transfer" },
                  ].map(({ label, action, href }) =>
                    href ? (
                      <Link key={label} href={href} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                        <RotateCcw className="w-3.5 h-3.5 text-primary" />{label}
                      </Link>
                    ) : (
                      <button key={label} onClick={action} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all text-left">
                        <RotateCcw className="w-3.5 h-3.5 text-primary" />{label}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="xl:col-span-3 space-y-6">

            {/* Domain Info Card (always visible) */}
            <div className="bg-card rounded-2xl border p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <InfoRow label="Status" value={<StatusBadge status={domain.status} />} />
                <InfoRow label="Registration Date" value={domain.registrationDate
                  ? new Date(domain.registrationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"} />
                <InfoRow label="Next Due Date" value={domain.nextDueDate
                  ? new Date(domain.nextDueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"} />
                <InfoRow label="First Payment" value={domain.firstPaymentAmount ? `Rs. ${domain.firstPaymentAmount}` : "—"} />
                <InfoRow label="Recurring Amount" value={domain.recurringAmount ? `Rs. ${domain.recurringAmount} / ${domain.billingCycle}` : "—"} />
                <InfoRow label="Payment Method" value={domain.paymentMethod || "—"} />
              </div>
            </div>

            {/* Tab Panels */}

            {/* Overview */}
            {activeTab === "overview" && (
              <div className="bg-card rounded-2xl border p-6 space-y-4">
                <h2 className="text-base font-semibold">What would you like to do today?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Change nameservers", tab: "nameservers" },
                    { label: "Update WHOIS contact info", tab: "contact" },
                    { label: "Change registrar lock status", tab: "lock" },
                    { label: "Renew Domain", action: handleRenew },
                  ].map(({ label, tab, action }) => (
                    <button
                      key={label}
                      onClick={() => tab ? setActiveTab(tab) : action?.()}
                      className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                    >
                      <ChevronRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                      <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Auto Renew */}
            {activeTab === "autorenew" && (
              <div className="bg-card rounded-2xl border p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Auto Renew</h2>
                  <p className="text-sm text-muted-foreground">Automatically renew this domain before it expires.</p>
                </div>
                <div className={`flex items-center justify-between p-5 rounded-xl border-2 ${domain.autoRenew ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center gap-3">
                    {domain.autoRenew
                      ? <CheckCircle className="w-6 h-6 text-emerald-400" />
                      : <XCircle className="w-6 h-6 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm">{domain.autoRenew ? "Auto Renew is Enabled" : "Auto Renew is Disabled"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {domain.autoRenew ? "Your domain will renew automatically before expiry." : "Your domain will not be renewed automatically."}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleToggleAutoRenew}
                    disabled={busy}
                    variant={domain.autoRenew ? "outline" : "default"}
                    className={domain.autoRenew ? "" : "bg-primary hover:bg-primary/90"}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : domain.autoRenew ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            )}

            {/* Nameservers */}
            {activeTab === "nameservers" && (
              <div className="bg-card rounded-2xl border p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Nameservers</h2>
                  <p className="text-sm text-muted-foreground">Update the nameservers your domain points to.</p>
                </div>
                <div className="space-y-3">
                  {ns.map((value, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6 shrink-0">NS{i + 1}</span>
                      <Input
                        value={value}
                        onChange={(e) => setNs((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                        placeholder={`ns${i + 1}.example.com`}
                        className="bg-background"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleUpdateNameservers}
                  disabled={busy}
                  className="bg-primary hover:bg-primary/90 gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                  Update Nameservers
                </Button>
              </div>
            )}

            {/* Registrar Lock */}
            {activeTab === "lock" && (
              <div className="bg-card rounded-2xl border p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Registrar Lock</h2>
                  <p className="text-sm text-muted-foreground">Prevent unauthorized transfers by locking your domain.</p>
                </div>
                <div className={`flex items-center justify-between p-5 rounded-xl border-2 ${domain.registrarLock ? "border-violet-500/30 bg-violet-500/5" : "border-border bg-muted/20"}`}>
                  <div className="flex items-center gap-3">
                    <Lock className={`w-6 h-6 ${domain.registrarLock ? "text-primary/60" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium text-sm">{domain.registrarLock ? "Domain is Locked" : "Domain is Unlocked"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {domain.registrarLock ? "Transfer protection is active." : "Domain can be transferred. Enable lock for security."}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleToggleLock}
                    disabled={busy}
                    variant={domain.registrarLock ? "outline" : "default"}
                    className={!domain.registrarLock ? "bg-primary hover:bg-primary/90" : ""}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : domain.registrarLock ? "Unlock" : "Lock Domain"}
                  </Button>
                </div>
                <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Unlocking your domain allows it to be transferred to another registrar. Only unlock if you are initiating a transfer.</p>
                </div>
              </div>
            )}

            {/* Addons */}
            {activeTab === "addons" && (
              <div className="bg-card rounded-2xl border p-6 space-y-4">
                <h2 className="text-base font-semibold">Domain Addons</h2>
                <div className={`flex items-center justify-between p-5 rounded-xl border-2 ${domain.idProtect ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"}`}>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className={`w-6 h-6 ${domain.idProtect ? "text-emerald-400" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium text-sm">ID Protect (WHOIS Privacy)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Hide your personal info from public WHOIS lookups.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={domain.idProtect ? "border-emerald-500/30 text-emerald-400" : ""}>
                    {domain.idProtect ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Contact */}
            {activeTab === "contact" && (
              <div className="bg-card rounded-2xl border p-6 space-y-4">
                <h2 className="text-base font-semibold">Contact Information</h2>
                <p className="text-sm text-muted-foreground">WHOIS contact information is managed through your account profile.</p>
                <Button variant="outline" asChild>
                  <Link href="/profile">Go to Profile Settings</Link>
                </Button>
              </div>
            )}

            {/* EPP Code */}
            {activeTab === "epp" && (
              <div className="bg-card rounded-2xl border p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold mb-1">Get EPP Code</h2>
                  <p className="text-sm text-muted-foreground">Request your domain's EPP/Auth code to transfer it to another registrar.</p>
                </div>
                <div className="flex items-start gap-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">The EPP code will be sent to your registered email address. Ensure registrar lock is disabled before initiating a transfer.</p>
                </div>
                {eppCode && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted border font-mono text-sm">
                    <Key className="w-4 h-4 text-primary/60 shrink-0" />
                    <span className="flex-1 break-all">{eppCode}</span>
                    <button onClick={() => { navigator.clipboard.writeText(eppCode); toast.success("Copied!"); }}>
                      <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </div>
                )}
                <Button
                  onClick={handleGetEpp}
                  disabled={busy}
                  className="bg-primary hover:bg-primary/90 gap-2"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {eppCode ? "Request New EPP Code" : "Get EPP Code"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
