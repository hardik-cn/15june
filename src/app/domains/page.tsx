"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import {
  Globe,
  Search,
  RefreshCcw,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  PlusCircle,
  Repeat2,
  Lock,
  Unlock,
  ExternalLink,
} from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "sonner";

interface Domain {
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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  Active: { label: "Active", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  Expired: { label: "Expired", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  Pending: { label: "Pending", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  Cancelled: { label: "Cancelled", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", dot: "bg-zinc-400" },
  Grace: { label: "Grace", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Pending"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-muted rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

const PAGE_SIZE = 10;
const STORAGE_KEY = "domains";
const CACHE_DURATION = 5 * 60 * 1000;

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDomains = useCallback(async (forceRefresh = false) => {
    setLoading(true);

    try {
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const isExpired = Date.now() - timestamp > CACHE_DURATION;

          if (!isExpired && Array.isArray(data)) {
            setDomains(data);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch fresh data from API
      const res = await apiFetch("/api/whmcs/domains/list");
      const result = await res.json();

      if (result.domains) {
        const domainsData = result.domains;
        setDomains(domainsData);

        // Save to sessionStorage with timestamp
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            data: domainsData,
            timestamp: Date.now(),
          })
        );
      } else {
        toast.error(result.error ?? "Failed to load domains");
      }
    } catch (error) {
      toast.error("Failed to load domains");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains(false);
  }, [fetchDomains]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    fetchDomains(true);
  };

  /* Derived */
  const filtered = domains.filter((d) => {
    const matchSearch = d.domain.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "All" ||
      (filter === "Active" && d.status === "Active") ||
      (filter === "Expired" && d.status === "Expired") ||
      (filter === "Pending" && d.status === "Pending") ||
      (filter === "AutoRenew" && d.autoRenew);
    return matchSearch && matchFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = {
    total: domains.length,
    active: domains.filter((d) => d.status === "Active").length,
    expiring: domains.filter((d) => {
      if (!d.expiryDate) return false;
      const diff = (new Date(d.expiryDate).getTime() - Date.now()) / 86400000;
      return diff > 0 && diff <= 30;
    }).length,
    autoRenew: domains.filter((d) => d.autoRenew).length,
  };

  // const handleSearch = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (searchDomain.trim()) {
  //     window.open(`https://www.cantec.in/domain-search?domain=${encodeURIComponent(searchDomain)}`, "_blank");
  //   }
  // };

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
              <span>/</span>
              <span className="text-foreground">My Domains</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">My Domains</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </Button>
            <Button size="sm" className="gap-2 bg-white" asChild>
              <Link href="/domains/register">
                <Plus className="w-4 h-4" />
                Register Domain
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Domains", value: stats.total, icon: Globe, gradient: "bg-gradientBg", border: "border border-gradientBorder", text: "text-primary" },
            { label: "Active", value: stats.active, icon: ShieldCheck, gradient: "bg-gradientBg", border: "border border-gradientBorder", text: "text-primary" },
            { label: "Expiring (30d)", value: stats.expiring, icon: Clock, gradient: "bg-gradientBg", border: "border border-gradientBorder", text: "text-primary" },
            { label: "Auto Renew", value: stats.autoRenew, icon: RotateCcw, gradient: "bg-gradientBg", border: "border border-gradientBorder", text: "text-primary" },
          ].map(({ label, value, icon: Icon, gradient, border, text }) => (
            <div key={label} className="bg-card rounded-2xl border p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} border ${border}`}>
                <Icon className={`w-5 h-5 ${text}`} />
              </div>
              <div className="w-full text-end">
                {loading
                  ? <div className="h-7 w-10 bg-muted animate-pulse rounded mb-1" />
                  : <p className="text-2xl font-bold">{value}</p>}
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* ── Left panel ── */}
          <div className="xl:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-card rounded-2xl border p-5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</p>
              {[
                { label: "Renew Domains", href: "/domains?action=renew", icon: RotateCcw },
                { label: "Register a Domain", href: "/domains/register", icon: PlusCircle },
                { label: "Transfer in a Domain", href: "/domains/transfer", icon: Repeat2 },
              ].map(({ label, href, icon: Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all group"
                >
                  <Icon className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                  {label}
                  <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="xl:col-span-3 bg-card rounded-2xl border flex flex-col">

            {/* Table toolbar */}
            <div className="p-5 border-b flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search domains…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 bg-background"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {["All", "Active", "Expired", "Pending", "AutoRenew"].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f
                      ? "bg-primary text-black shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                  >
                    {f === "AutoRenew" ? "Auto Renew" : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Domain</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registration Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Due Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Auto Renew</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Globe className="w-10 h-10 opacity-20" />
                          <p className="font-medium">No domains found</p>
                          <p className="text-xs">{search ? "Try a different search term" : "Register your first domain to get started"}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((domain) => (
                      <tr key={domain.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${domain.status === "Active"
                              ? "bg-emerald-500/10 border border-emerald-500/20"
                              : "bg-muted border border-border"
                              }`}>
                              <Globe className={`w-3.5 h-3.5 ${domain.status === "Active" ? "text-emerald-400" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <Link
                                href={`/domains/${domain.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                {domain.domain}
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">{domain.billingCycle || "—"} Year</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {domain.registrationDate
                            ? new Date(domain.registrationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {domain.nextDueDate
                            ? new Date(domain.nextDueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${domain.autoRenew
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            : "bg-muted text-muted-foreground border-border"
                            }`}>
                            {domain.autoRenew ? <><RotateCcw className="w-3 h-3" /> Enabled</> : "Disabled"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={domain.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link href={`/domains/${domain.id}`} className="flex items-center gap-2 cursor-pointer">
                                  <Globe className="w-3.5 h-3.5" /> Manage Domain
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/domains/${domain.id}?tab=nameservers`} className="flex items-center gap-2 cursor-pointer">
                                  <Repeat2 className="w-3.5 h-3.5" /> Manage Nameservers
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/domains/${domain.id}?tab=contact`} className="flex items-center gap-2 cursor-pointer">
                                  <AlertCircle className="w-3.5 h-3.5" /> Edit Contact Info
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/domains/${domain.id}?tab=autorenew`} className="flex items-center gap-2 cursor-pointer">
                                  {domain.autoRenew ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                  Auto Renewal Status
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/domains/${domain.id}?tab=renew`} className="flex items-center gap-2 cursor-pointer">
                                  <RotateCcw className="w-3.5 h-3.5" /> Renew
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div className="px-6 py-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${page === i + 1
                        ? "bg-primary text-black"
                        : "hover:bg-muted text-muted-foreground"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
