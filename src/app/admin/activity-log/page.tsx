// app/admin/activity-log/page.tsx

"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import AdminDashboardWrapper from "../components/AdminDashboardWrapper";
import { adminFetch } from "@/lib/admin/adminFetch";
import { Search, Calendar, ChevronDown, Monitor, MapPin, ArrowRight, Clock, Smartphone, Laptop, Server, Download, RotateCcw, CheckCircle2, AlertCircle, XCircle, Info, Filter, Activity, User, Shield, History } from "lucide-react";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// LogEntry Interface
export interface LogEntry {
  id: string;
  eventName: string;
  component: string;
  actor: { name: string; role: string; };
  userId: number;
  timestamp: string;
  status: "Success" | "Warning" | "Error" | "Info";
  details: string;
  metadata: { ip: string; os: string; device: string; browser: string; };
  rawData?: any;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to recursively clean sensitive information from raw data payloads
function sanitizeData(data: any): any {
  if (!data) return data;
  if (typeof data !== "object") {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return JSON.stringify(sanitizeData(parsed));
      } catch {
        return data;
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'secret', 'twofactor', 'key', 'pin', 'credential'];

  for (const key of Object.keys(sanitized)) {
    const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
    if (isSensitive) {
      sanitized[key] = "********";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }

  return sanitized;
}

export default function ActivityLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    const fetchLogs = async () => {
      try {
        setIsLoading(true);

        // Ensure that the API request is using HTTPS to prevent Man-in-the-Middle (MITM) attacks
        const res = await adminFetch("/api/admin/activity-log");

        if (!res.ok) {
          // Log only necessary information to avoid exposing sensitive details
          console.error("Failed to fetch logs: Server responded with an error.");
          return;
        }

        const data = await res.json();

        if (data.success) {
          const mappedLogs: LogEntry[] = data.logs.map((logmapData: any) => ({
            id: logmapData.id,
            eventName: logmapData.logAction.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
            component: logmapData.logAction,
            actor: {
              name: logmapData.adminName || "System",
              role: logmapData.actorRole || "Admin",
            },
            userId: logmapData.userId,
            timestamp: logmapData.createdAt,
            status: logmapData.logAction.includes("ERROR") || logmapData.logAction.includes("FAIL") ? "Error" : "Success",
            details: logmapData.logMessage,
            metadata: {
              ip: logmapData.ipAddress || "Unknown",
              os: logmapData.userAgent?.includes("Windows") ? "Windows" : logmapData.userAgent?.includes("Mac") ? "MacOS" : "Unknown",
              device: logmapData.device || "Unknown",
              browser: logmapData.browser || "Unknown",
            },
            rawData: sanitizeData(logmapData.rawData), // Cleaned sensitive fields
          }));

          setLogs(mappedLogs);
        } else {
          console.error("Failed to fetch logs: Data response was unsuccessful.");
        }
      } catch (error) {
        // Avoid logging sensitive error information, use generic message instead
        console.error("Failed to fetch logs. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // console.log(logs[1]?.rawData?.name)

  // const filteredLogs = useMemo(() => {
  //   return logs.filter(log => {
  //     const matchesSearch =
  //       log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //       log.eventName.toLowerCase().includes(searchQuery.toLowerCase());

  //     const matchesStatus = selectedStatus === "All" || log.status === selectedStatus;
  //     return matchesSearch && matchesStatus;
  //   });
  // }, [searchQuery, selectedStatus]);
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.eventName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === "All" ||
        log.status?.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [logs, searchQuery, selectedStatus]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: LogEntry[] } = {};
    filteredLogs.forEach(log => {
      const dateKey = format(new Date(log.timestamp), "MMMM d, yyyy");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(log);
    });
    return groups;
  }, [filteredLogs]);

  return (
    <AdminDashboardWrapper requireModule="activity-log">
      <div className="space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">System Activity Log</h1>
            {/* <p className="text-white/40 text-sm">Comprehensive audit trail of internal system events and administrative actions.</p> */}
          </div>
          {/* <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-sm text-white/70 font-medium hover:border-white/[0.2] transition-colors">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/15 to-white/10 hover:from-white/20 hover:to-white/15 text-white font-medium border border-white/[0.1] text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <RotateCcw className="w-4 h-4" />
              Sync
            </button>
          </div> */}
        </div>

        {/* Summary Cards */}
        {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/50 text-sm mb-1">Total Signals</p>
            <p className="text-2xl font-bold text-white/90">{logs.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/50 text-sm mb-1">Success</p>
            <p className="text-2xl font-bold text-white/80">{logs.filter(l => l.status === "Success").length}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/50 text-sm mb-1">Alerts</p>
            <p className="text-2xl font-bold text-white/80">{logs.filter(l => l.status === "Warning").length}</p>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/50 text-sm mb-1">Failures</p>
            <p className="text-2xl font-bold text-white/60">{logs.filter(l => l.status === "Error").length}</p>
          </div>
        </div> */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Total Signals</p>
            <p className="text-3xl font-bold text-white/90">{logs.length}</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Total Success</p>
            <p className="text-3xl font-bold text-white/90">{logs.filter(l => l.status === "Success").length}</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Total Alerts</p>
            <p className="text-3xl font-bold text-white/90">{logs.filter(l => l.status === "Warning").length}</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Total Failures</p>
            <p className="text-3xl font-bold text-white/90">{logs.filter(l => l.status === "Error").length}</p>
          </div>
          {/* <div className="p-6 rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08]">
            <p className="text-white/40 text-sm font-medium mb-2">Total Info</p>
            <p className="text-3xl font-bold text-white/90">{logs.filter(l => l.status === "Info").length}</p>
          </div> */}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by event, name, or metadata..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-white/90 placeholder-white/30 focus:outline-none focus:border-white/[0.2]"
            />
          </div>
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <select
              className="w-full appearance-none pl-11 pr-10 py-3 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-white/90 cursor-pointer focus:outline-none focus:border-white/[0.2] text-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All" className="bg-[#141414]">All Events</option>
              <option value="Success" className="bg-[#141414]">Success</option>
              <option value="Warning" className="bg-[#141414]">Warning</option>
              <option value="Error" className="bg-[#141414]">Errors</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
          {/* <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] text-sm text-white/70 hover:text-white transition-colors">
            <Calendar className="w-4 h-4 text-white/40" />
            Date
          </button> */}
        </div>

        {/* Timeline Core */}
        <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] overflow-hidden">
          <div className="p-6 md:p-8">

            {isLoading ? (
              <div className="py-24 text-center">
                <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
                <p className="text-white/60 mb-2">Loading system logs...</p>
              </div>
            ) : Object.entries(groupedLogs).length > 0 ? (
              <div className="space-y-8">
                {Object.entries(groupedLogs).map(([date, logs]) => (
                  <div key={date} className="relative">

                    {/* Date Divider */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-xs font-semibold tracking-widest text-white/40">
                        {date}
                      </div>
                      <div className="flex-1 h-px bg-white/5"></div>
                    </div>

                    {/* Events for the Date */}
                    <div className="space-y-0 border-l border-white/[0.08] ml-2 md:ml-36">
                      {logs.map((log) => (
                        <LogEntryRow
                          key={log.id}
                          log={log}
                          isExpanded={expandedLogId === log.id}
                          onToggle={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        />
                      ))}
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="py-24 text-center">
                <svg className="w-12 h-12 mx-auto text-white/30 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-white/60 mb-2">No activities found matching your filters.</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </AdminDashboardWrapper>
  );
}

function LogEntryRow({ log, isExpanded, onToggle }: { log: LogEntry; isExpanded: boolean; onToggle: () => void }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Success": return <CheckCircle2 className="w-3.5 h-3.5 text-white/80" />;
      case "Error": return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case "Warning": return <AlertCircle className="w-3.5 h-3.5 text-white/60" />;
      default: return <Info className="w-3.5 h-3.5 text-white/40" />;
    }
  };

  const getStatusIndicatorColors = (status: string) => {
    switch (status) {
      case "Success": return "bg-[#141414] border-white/20";
      case "Error": return "bg-red-500/10 border-red-500/30";
      case "Warning": return "bg-[#141414] border-white/10";
      default: return "bg-[#141414] border-white/10";
    }
  };

  return (
    <div className="relative pl-6 md:pl-10 pb-2 last:pb-2 group">
      {/* Node Dot */}
      <div className={cn(
        "absolute left-[-11px] top-2.5 w-[22px] h-[22px] rounded-full border-[3px] border-[#141414] flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
        getStatusIndicatorColors(log.status),
        isExpanded && "scale-110"
      )}>
        {getStatusIcon(log.status)}
      </div>

      {/* Main Content Container */}
      <div className={cn(
        "rounded-xl transition-all duration-300 border border-transparent overflow-hidden",
        isExpanded ? "bg-white/[0.03] border-white/[0.08]" : "hover:bg-white/[0.02]"
      )}>

        {/* Row Header (Always visible) */}
        <div
          className="flex flex-col md:flex-row md:items-start gap-4 p-4 cursor-pointer select-none"
          onClick={onToggle}
        >
          {/* Time & Actor Meta (Desktop Left Side) */}
          <div className="absolute left-[-140px] top-3 hidden md:flex w-[110px] flex-col items-end text-right">
            <span className="text-[12px] font-medium text-white/40 tracking-widest">
              {format(new Date(log.timestamp), "h:mm:ss a")}
            </span>
            <span className="text-[10px] text-white/90 tracking-widest mt-0.5">
              {log.actor.role}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 opacity-70">
              <span className="text-[10px] text-white/90 font-normal tracking-wider">{log.actor.name.split(' ')[0]}</span>
              {/* <div className="w-4 h-4 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[8px] font-bold text-white/90">
                {log.actor.name.charAt(0)}
              </div> */}
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="md:hidden text-xs font-mono text-white/40">
                    {format(new Date(log.timestamp), "h:mm a")}
                  </span>
                  <h4 className="text-[15px] font-medium text-white/90 group-hover:text-white transition-colors">
                    {log.eventName}
                  </h4>
                </div>
                <div className="flex items-center flex-wrap gap-2 text-sm text-white/50">
                  <span className="truncate">{log.details}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-white/40">


                {/* Expand Chevron */}
                <div className={cn(
                  "p-1.5 rounded-lg text-white/50 transition-transform duration-300",
                  isExpanded ? "rotate-180 text-white" : "group-hover:bg-white/5"
                )}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Audit Payload */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-2 duration-300">
            <div className="p-5 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#141414] border border-white/[0.08] shadow-inner grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">

              {/* Context Block */}
              <div className="space-y-4">
                <p className="text-white/80 text-xs tracking-wider font-semibold border-b border-white/[0.08] pb-2">Session Context</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 tracking-wider">Module</span>
                    <span className="text-white/80 text-[11px] tracking-wider">{log.component}</span>
                  </div>

                </div>
              </div>

              {/* System Data Block */}
              <div className="space-y-4">
                <p className="text-white/80 text-xs tracking-wider font-semibold border-b border-white/[0.08] pb-2">Client Details</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 tracking-wider">IP Address</span>
                    <span className="text-white/80 text-xs">{log.metadata.ip}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 tracking-wider">Client Info</span>
                    <span className="text-white/80 text-xs text-right truncate">
                      {/* {log.metadata.os} /  */}
                      {log.metadata.device}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 tracking-wider">Browser</span>
                    <span className="text-white/80 text-xs">{log.metadata.browser}</span>
                  </div>
                </div>
              </div>

              {/* Security / Audit Block */}
              <div className="space-y-4 md:col-span-2 lg:col-span-1">
                <p className="text-white/80 text-xs tracking-wider font-semibold border-b border-white/[0.08] pb-2">Audit Log</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 tracking-wider">Event ID</span>
                    <span className="text-white/80 text-xs">#{log.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 tracking-wider">User ID</span>
                    <span className="text-white/80 text-xs">
                      {log.userId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 tracking-wider">Timestamp</span>
                    <span className="text-white/80 text-xs">{format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}</span>
                  </div>

                </div>
              </div>

              {/* Data Changes Block */}
              {(() => {
                let rawData = (log as any).rawData;
                if (!rawData) return null;

                if (typeof rawData === "string") {
                  try {
                    rawData = JSON.parse(rawData);
                  } catch (e) {
                    return null;
                  }
                }

                const oldData = rawData.oldData;
                const newData = rawData.newData;

                // If we have explicit oldData/newData schema, render the diff
                if (oldData !== undefined || newData !== undefined) {
                  const safeOldData = oldData || {};
                  const safeNewData = newData || {};
                  const allKeys = Array.from(new Set([...Object.keys(safeOldData), ...Object.keys(safeNewData)]));

                  const changes = allKeys.map(key => {
                    const oldVal = safeOldData[key];
                    const newVal = safeNewData[key];
                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                      return { key, oldVal, newVal };
                    }
                    return null;
                  }).filter(Boolean);

                  if (changes.length > 0) {
                    return (
                      <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-white/[0.08] mt-2 space-y-4">
                        <p className="text-white/80 text-xs tracking-wider font-semibold ">Data Changes</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {/* NAME (always visible) */}
                          {/* <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                            <p className="text-white/50 text-xs mb-2">Name</p>
                            <div className="text-xs text-white/80 truncate" title={newData?.name}>
                              {newData?.name || "None"}
                            </div>
                          </div> */}

                          {/* CHANGES */}
                          {changes.map((change, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                              <p className="text-white/50 text-xs capitalize mb-2">
                                {change?.key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>

                              <div className="flex items-center gap-3 text-xs">
                                {change?.oldVal !== undefined && change?.oldVal !== null ? (
                                  <span className="text-white/50 line-through truncate max-w-[120px]">
                                    {String(change.oldVal)}
                                  </span>
                                ) : (
                                  <span className="text-white/30 italic">None</span>
                                )}

                                <svg className="w-3.5 h-3.5 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>

                                {change?.newVal !== undefined && change?.newVal !== null ? (
                                  <span className="text-emerald-400/90 font-medium truncate max-w-[120px]">
                                    {String(change.newVal)}
                                  </span>
                                ) : (
                                  <span className="text-white/30 italic">None</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                }

                // Fallback: If no explicit diff format or no changes detected, just show the raw object
                if (Object.keys(rawData).length > 0) {
                  return (
                    <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-white/[0.08] mt-2">
                      <span className="block text-white/40 text-xs uppercase tracking-wider font-semibold mb-3">Raw Payload</span>
                      <div className="bg-[#0a0a0a] rounded-lg border border-white/[0.05] overflow-hidden">
                        <pre className="text-[10px] sm:text-xs text-white/70 p-4 overflow-x-auto whitespace-pre-wrap word-break font-mono">
                          {JSON.stringify(rawData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
