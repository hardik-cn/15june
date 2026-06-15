"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Ticket, CalendarCheck2, Clock, Plus, Server, Search, X, Download, RefreshCcw, Loader2, Eye } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, } from "@/app/components/ui/breadcrumb";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/apiFetch";

// ---------- Types ----------
interface TicketData {
  id: string;
  tid: string;
  c: string;
  subject: string;
  status: string;
  priority: string;
  date: string;
  lastreply: string;
  deptid: string;
  name: string;
  email: string;
  attachment: string;
  attachments: { filename: string; index: number }[];
}

interface Department {
  id: string;
  name: string;
}

// ---------- Helpers ----------
function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case "high":
      return "bg-orange-500/10 text-orange-500";
    case "urgent":
      return "bg-red-500/10 text-red-500";
    case "low":
      return "bg-green-500/10 text-green-500";
    case "medium":
    default:
      return "bg-yellow-500/10 text-yellow-500";
  }
}

function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "closed") return "bg-muted text-muted-foreground";
  if (s === "answered") return "bg-blue-500/10 text-blue-400";
  if (s === "customer-reply" || s === "in progress") return "bg-purple-500/10 text-purple-400";
  // open, awaiting reply, etc.
  return "bg-white/[0.08] text-white";
}

function getStatusDot(status: string): string {
  const s = status.toLowerCase();
  if (s === "closed") return "bg-muted-foreground";
  if (s === "answered") return "bg-blue-400";
  if (s === "customer-reply" || s === "in progress") return "bg-purple-400";
  return "bg-white";
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

const ROWS_PER_PAGE = 10;

export function formatTicketDate(dateString: string): string {
  if (!dateString) return "";

  // Convert "YYYY-MM-DD HH:mm:ss" → ISO format
  const isoString = dateString.replace(" ", "T");

  const date = new Date(isoString);

  if (isNaN(date.getTime())) return dateString; // fallback

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} (${hours}:${minutes})`;
}

export default function SupportPage() {
  const router = useRouter();
  const TICKET_CACHE_KEY = "whmcs_ticket_list";
  const [activeTab, setActiveTab] = useState("recent");
  const [timeFilter, setTimeFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // API state
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([]);
  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments]
  );

  // ---------- Fetch tickets ----------
  // const fetchTickets = useCallback(async () => {
  //   setLoading(true);
  //   setError(null);
  //   try {
  //     const params = new URLSearchParams({
  //       limitnum: "250",
  //       ignore_dept_assignments: "true",
  //     });

  //     const res = await apiFetch(`/api/whmcs/tickets?${params.toString()}`);
  //     if (!res.ok) {
  //       const data = await res.json().catch(() => ({}));
  //       throw new Error(data.error || "Failed to fetch tickets");
  //     }

  //     const data = await res.json();
  //     setTickets(data.tickets || []);
  //     setTotalResults(data.totalresults ?? 0);
  //   } catch (err: any) {
  //     console.error("Fetch tickets error:", err);
  //     setError(err.message || "Something went wrong");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  const fetchTickets = useCallback(async (forceRefresh = false) => {

    setLoading(true);
    setError(null);

    try {

      if (!forceRefresh) {
        const cached = sessionStorage.getItem(TICKET_CACHE_KEY);

        if (cached) {
          const parsed = JSON.parse(cached);

          setTickets(parsed.tickets || []);
          setTotalResults(parsed.totalresults || 0);

          setLoading(false);

          return;
        }
      }

      const params = new URLSearchParams({
        limitnum: "250",
        ignore_dept_assignments: "true",
      });

      const res = await apiFetch(`/api/whmcs/tickets?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch tickets");
      }

      const data = await res.json();

      sessionStorage.setItem(
        TICKET_CACHE_KEY,
        JSON.stringify({
          tickets: data.tickets || [],
          totalresults: data.totalresults || 0,
        })
      );

      setTickets(data.tickets || []);
      setTotalResults(data.totalresults ?? 0);

    } catch (err: any) {

      console.error("Fetch tickets error:", err);

      setError(err.message || "Something went wrong");

    } finally {
      setLoading(false);
    }

  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ---------- Fetch departments ----------
  useEffect(() => {
    apiFetch("/api/whmcs/tickets/departments")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setDepartments(data.departments || []))
      .catch(() => { });
  }, []);

  // ---------- Derived counts ----------
  const openCount = useMemo(() => tickets.filter((t) => t.status.toLowerCase() !== "closed").length, [tickets]);
  const closedCount = useMemo(() => tickets.filter((t) => t.status.toLowerCase() === "closed").length, [tickets]);

  // ---------- Filtered tickets ----------
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search
      if (
        searchQuery &&
        !ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.tid.includes(searchQuery) &&
        !ticket.id.includes(searchQuery)
      ) {
        return false;
      }

      // Tab filtering
      const statusLower = ticket.status.toLowerCase();
      if (activeTab === "open" && statusLower === "closed") return false;
      if (activeTab === "closed" && statusLower !== "closed") return false;

      // Department filtering
      if (deptFilter !== "all" && ticket.deptid !== deptFilter) return false;

      // Time filtering
      const ticketDate = new Date(ticket.date).getTime();
      const now = Date.now();
      const diffHrs = (now - ticketDate) / (1000 * 60 * 60);
      const diffDays = diffHrs / 24;

      if (timeFilter === "24h" && diffHrs > 24) return false;
      if (timeFilter === "7d" && diffDays > 7) return false;
      if (timeFilter === "14d" && diffDays > 14) return false;
      if (timeFilter === "30d" && diffDays > 30) return false;

      return true;
    });
  }, [tickets, searchQuery, timeFilter, activeTab, deptFilter]);

  // ---------- Pagination ----------
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / ROWS_PER_PAGE));
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredTickets.slice(start, start + ROWS_PER_PAGE);
  }, [filteredTickets, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, timeFilter, activeTab, deptFilter]);

  // ---------- Export CSV ----------
  const handleExportCSV = () => {
    const headers = ["Ticket ID", "Subject", "Department", "Status", "Priority", "Created", "Last Reply"];
    const csvContent = [
      headers.join(","),
      ...filteredTickets.map(
        (t) =>
          `${t.tid},"${t.subject}","${deptMap[t.deptid] || t.deptid}",${t.status},${t.priority},"${t.date}","${t.lastreply}"`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "tickets_export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Tickets</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-3xl mt-3 font-bold tracking-tight">Tickets</h1>
          </div>

          <Button variant="default" className="" asChild>
            <Link href="/support/create-ticket">
              <Plus className="w-4 h-4" />
              Create Ticket
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border flex flex-col justify-between overflow-hidden">
            <div className="p-6 flex items-start justify-between gap-4">
              <div className="bg-gradientBg border border-gradientBorder p-4 rounded-lg">
                <Ticket className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{loading ? "—" : tickets.length}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </div>
            <div className="border-t bg-muted/20 p-3 text-right">
              <Link href="#" className="text-sm hover:underline">View All</Link>
            </div>
          </div>

          <div className="bg-card rounded-xl border flex flex-col justify-between overflow-hidden">
            <div className="p-6 flex items-start justify-between gap-4">
              <div className="bg-gradientBg border border-gradientBorder p-4 rounded-lg">
                <CalendarCheck2 className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{loading ? "—" : closedCount}</p>
                <p className="text-sm text-muted-foreground">Closed Tickets</p>
              </div>
            </div>
            <div className="border-t bg-muted/20 p-3 text-right">
              <Link href="#" className="text-sm hover:underline">View All</Link>
            </div>
          </div>

          <div className="bg-card rounded-xl border flex flex-col justify-between overflow-hidden">
            <div className="p-6 flex items-start justify-between gap-4">
              <div className="bg-gradientBg border border-gradientBorder p-4 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{loading ? "—" : openCount}</p>
                <p className="text-sm text-muted-foreground">Open Tickets</p>
              </div>
            </div>
            <div className="border-t bg-muted/20 p-3 text-right">
              <Link href="#" className="text-sm hover:underline">View All</Link>
            </div>
          </div>
        </div>

        {/* Tickets Table Area */}
        <div className="bg-card rounded-xl border flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex items-center gap-6 px-6 pt-4 border-b">
            {[
              { id: 'recent', label: 'Recent Tickets', icon: Clock },
              { id: 'open', label: 'Open Tickets', icon: Server },
              { id: 'closed', label: 'Closed Tickets', icon: CalendarCheck2 }
            ].map((tab) => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 pb-3 cursor-pointer text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-white text-white"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </div>
            ))}
          </div>

          {/* Filters & Tools */}
          <div className="flex flex-col gap-4 p-4 border-b bg-muted/10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets"
                  className="pl-9 pr-8 bg-card border-white/[0.15] h-10 rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setSearchQuery("")} />
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
                {/* Department filter */}
                {departments.length > 0 && (
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="h-10 rounded-lg border border-white/[0.15] bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-white/20 shrink-0"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}

                <div className="flex items-center bg-card border rounded-lg p-1 px-2 h-12 w-max shrink-0">
                  {['All', '24h', '7d', '14d', '30d'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setTimeFilter(opt.toLowerCase())}
                      className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-[6px] transition-all",
                        timeFilter === opt.toLowerCase()
                          ? "border bg-white text-black shadow-sm"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="border h-10 px-3 shrink-0 bg-card" onClick={handleExportCSV}>
                        <Download className="w-4 h-4 text-white" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground">
                      Export as CSV
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-10 px-3 shrink-0 hover:bg-muted/30 border border-transparent"
                        onClick={() => {
                          sessionStorage.removeItem(TICKET_CACHE_KEY);
                          fetchTickets(true);
                        }}
                        disabled={loading}
                      >
                        <RefreshCcw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground">
                      Refresh
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-[11px] font-semibold text-muted-foreground uppercase bg-muted/20 border-b tracking-wider">
                <tr>
                  <th className="px-6 py-4">TICKET ID</th>
                  <th className="px-6 py-4">SUBJECT</th>
                  <th className="px-6 py-4">DEPARTMENT</th>
                  <th className="px-6 py-4">STATUS</th>
                  <th className="px-6 py-4">PRIORITY</th>
                  <th className="px-6 py-4">CREATED</th>
                  <th className="px-6 py-4">LAST REPLY</th>
                  <th className="px-6 py-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading tickets...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-red-400">
                      {error}
                    </td>
                  </tr>
                ) : paginatedTickets.length > 0 ? (
                  paginatedTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-muted/5 transition-colors group"
                    >
                      <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                        #{ticket.tid}
                      </td>
                      <td className="px-6 py-4 text-foreground text-[14px] max-w-[260px]">
                        <span className="truncate block" title={ticket.subject}>{ticket.subject}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="truncate block">
                          {deptMap[ticket.deptid] || `Dept #${ticket.deptid}`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={cn("bg-gradient-to-r from-white/[0.08] to-transparent shadow-none border border-white/[0.15] h-6 px-3 rounded-full capitalize font-medium", getStatusColor(ticket.status))}>
                          <span className={cn("w-1.5 h-1.5 rounded-full mr-2 inline-block", getStatusDot(ticket.status))} />
                          {ticket.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className={cn("shadow-none border-0 h-6 px-3 rounded-full font-medium min-w-[70px] justify-center", getPriorityColor(ticket.priority))}>
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {formatTicketDate(ticket.date)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {formatTicketDate(ticket.lastreply)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs font-medium gap-1.5 border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.10] transition-colors"
                          onClick={() => router.push(`/support/ticket/${ticket.tid}?c=${ticket.c}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Ticket
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      No tickets found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {/* Pagination / Rows Info */}
            <div className="flex items-center justify-end text-sm text-muted-foreground gap-4 p-4">
              <div className="flex items-center gap-1 font-medium">
                Rows per page <span className="text-foreground ml-1">{ROWS_PER_PAGE}</span> <span className="opacity-50 text-[10px] ml-0.5">▼</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="w-7 h-7 flex items-center justify-center rounded border border-transparent hover:border-muted/50 transition-colors disabled:opacity-30"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors",
                      currentPage === page
                        ? "bg-blue-500/10 text-blue-500 font-semibold border-0"
                        : "border border-transparent hover:border-muted/50"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="w-7 h-7 flex items-center justify-center rounded border border-transparent hover:border-muted/50 transition-colors disabled:opacity-30"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
