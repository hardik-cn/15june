// app/billing/invoices/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Search, SlidersHorizontal, RefreshCcw, Eye, CreditCard, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { toast } from "sonner";
import { useCallback } from "react";

type InvoiceRow = {
  id: string;
  documentNumber: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
};

type ApiInvoice = {
  id: string;
  invoiceid: string;
  invoicenum?: string;
  date: string;
  duedate: string;
  total: string;
  status: string;
};

type ApiResponse = {
  totalresults: number;
  invoices: ApiInvoice[];
};

function formatDmy(dateStr: string) {
  if (!dateStr) return "";

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  const day = String(d.getDate()).padStart(2, "0"); // ensures 02
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();

  return `${day},${month} ${year}`;
}

function formatCurrency(amount: string, currency: string = "INR", locale: string = "en-IN") {
  const cleaned = amount.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return amount;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return amount;
  }
}

const STORAGE_KEY = "invoices_list";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [currencyData, setCurrencyData] = useState({ code: "INR", symbol: "₹" });


  const fetchInvoices = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Check sessionStorage cache
      if (!forceRefresh) {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setInvoices(data);
            setLoading(false);
            return;
          }
        }
      }

      // 2. Fetch fresh data
      const res = await apiFetch("/api/whmcs/billing/invoices");

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load invoices");
      }

      const data = await res.json();

      const mapped: InvoiceRow[] = (data.invoices || []).map((inv: any) => ({
        id: inv.id,
        documentNumber: `#${inv.invoicenum || inv.invoiceid}`,
        status: inv.status || "Unknown",
        invoiceDate: formatDmy(inv.date),
        dueDate: formatDmy(inv.duedate),
        amount: inv.total,
      }));

      setInvoices(mapped);

      // 3. Save to sessionStorage
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data: mapped,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to fetch invoices";
      setError(message);
      toast.error(message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchInvoices(false);
  }, [fetchInvoices]);

  // === Refresh Handler ===
  const handleRefresh = () => {
    // Clear cache from sessionStorage
    sessionStorage.removeItem(STORAGE_KEY);
    // Force fresh fetch
    fetchInvoices(true);
  };

  const stats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;
    let refunded = 0;

    invoices.forEach((inv) => {
      const amount = parseFloat(inv.amount.replace(/[^0-9.-]/g, "")) || 0;
      total += amount;
      if (inv.status === "Paid") {
        paid += amount;
      } else if (inv.status === "Unpaid") {
        unpaid += amount;
      } else if (inv.status === "Refunded" || inv.status === "Cancelled") {
        refunded += amount;
      }
    });

    return { total, paid, unpaid, refunded };
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((row) => {
      const matchesQuery =
        q.length === 0 ||
        row.documentNumber.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "All" ? true : row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [invoices, query, statusFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Billing Invoices</h1>
          <Badge variant="outline" className="text-muted-foreground font-normal">
            {currencyData.code} Currency
          </Badge>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Amount</p>
                <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(stats.total.toString(), currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</h3>
                <p className="text-xs text-muted-foreground/60">All invoices</p>
              </div>
              <div className="p-2.5 bg-foreground/5 rounded-xl text-foreground transition-transform group-hover:scale-110 border border-border/40">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            {/* <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2">
              <div className="px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground text-[10px] font-bold flex items-center gap-1 leading-none border border-border/20">
                <SlidersHorizontal className="w-2.5 h-2.5 rotate-180" />
                -0.0% this month
              </div>
            </div> */}
          </div>

          <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Paid</p>
                <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(stats.paid.toString(), currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</h3>
                <p className="text-xs text-muted-foreground/60">Paid invoices</p>
              </div>
              <div className="p-2.5 bg-foreground/5 rounded-xl text-foreground transition-transform group-hover:scale-110 border border-border/40">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            {/* <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2">
              <div className="px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground text-[10px] font-bold flex items-center gap-1 leading-none border border-border/20">
                <SlidersHorizontal className="w-2.5 h-2.5 rotate-180" />
                -0.0% this month
              </div>
            </div> */}
          </div>

          <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Unpaid</p>
                <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(stats.unpaid.toString(), currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</h3>
                <p className="text-xs text-muted-foreground/60">Outstanding invoices</p>
              </div>
              <div className="p-2.5 bg-foreground/5 rounded-xl text-foreground transition-transform group-hover:scale-110 border border-border/40">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            {/* <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2">
              <div className="px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground text-[10px] font-bold flex items-center gap-1 leading-none border border-border/20">
                <SlidersHorizontal className="w-2.5 h-2.5" />
                +0.0% this month
              </div>
            </div> */}
          </div>

          <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Refunded/Cancelled</p>
                <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(stats.refunded.toString(), currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</h3>
                <p className="text-xs text-muted-foreground/60">Other statuses</p>
              </div>
              <div className="p-2.5 bg-foreground/5 rounded-xl text-foreground transition-transform group-hover:scale-110 border border-border/40">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            {/* <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-2">
              <div className="px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground text-[10px] font-bold flex items-center gap-1 leading-none border border-border/20">
                <RefreshCcw className="w-2.5 h-2.5" />
                No change
              </div>
            </div> */}
          </div>
        </div>

        <div className="bg-card rounded-xl border flex flex-col">
          {/* <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Billing Invoices</h2>
          </div> */}

          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-muted/20">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bill..."
                className="pl-9 w-full bg-background"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    {statusFilter === "All" ? `All Invoice (${filtered.length})` : `${statusFilter} (${filtered.length})`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("All")}>All Invoice</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Paid")}>Paid</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Unpaid")}>Unpaid</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Refunded")}>Refunded</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Cancelled")}>Cancelled</DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={() => setStatusFilter("Collections")}>Collections</DropdownMenuItem> */}
                  {/* <DropdownMenuItem onClick={() => setStatusFilter("Payment")}>Payment Pending</DropdownMenuItem> */}
                </DropdownMenuContent>
              </DropdownMenu>

              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <RefreshCcw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground">
                    Refresh
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

            </div>
          </div>

          {error ? (
            <div className="px-6 py-4 text-sm text-muted-foreground">{error}</div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/40 border-y">
                <tr>
                  <th className="px-6 py-4 font-medium">Invoice ID #</th>
                  {/* <th className="px-6 py-4 font-medium">DOCUMENT TYPE</th> */}
                  <th className="px-6 py-4 font-medium">Invoice Date</th>
                  <th className="px-6 py-4 font-medium">Due Date</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-24 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 w-16 bg-muted rounded" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="h-8 w-8 bg-muted rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{row.documentNumber}</td>
                      <td className="px-6 py-4 text-foreground font-light tracking-[0.5px]">{row.invoiceDate}</td>
                      <td className="px-6 py-4 text-foreground font-light tracking-[0.5px]">{row.dueDate}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{formatCurrency(row.amount, currencyData.code, currencyData.code === "INR" ? "en-IN" : "en-US")}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={row.status === "Paid" ? "default" : "secondary"}
                          className={
                            row.status === "Paid"
                              ? "bg-[#242424] text-foreground hover:bg-foreground/15 shadow-none border-0"
                              : "bg-muted text-foreground hover:bg-muted/80 shadow-none border-0"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/billing/invoices/${row.id}`)}
                                  className="h-8 px-2"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="font-light tracking-[0.5px] text-xs rounded-[6px]">View Invoice</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/billing/invoices/${row.id}`)}
                                  className={`h-8 px-2 transition-colors ${row.status === "Unpaid"
                                    ? "text-foreground hover:bg-foreground/10"
                                    : "text-muted-foreground/40 cursor-not-allowed"
                                    }`}
                                  disabled={row.status !== "Unpaid"}
                                >
                                  <CreditCard className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="font-light tracking-[0.5px] text-xs rounded-[6px]">Pay Now</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}