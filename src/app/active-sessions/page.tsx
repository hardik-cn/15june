// src/app/active-sessions/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/app/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { Shield, LogOut, RefreshCw, Search, Info, Loader2, Laptop, Smartphone, Chrome, AlertTriangle, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/apiFetch";
import { clearAccessToken } from "@/lib/auth/tokenStore";

interface ActiveSession {
    id: string;
    deviceName: string;
    userAgent: string;
    ipAddress: string;
    expiresAt: string;
    lastActivity: string;
    createdAt: string;
    isCurrent: boolean;
}

export default function ActiveSessionsPage() {
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [pageSize, setPageSize] = useState("10");
    const [terminatingId, setTerminatingId] = useState<string | null>(null);

    // Modal & confirmation state variables
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [sessionToLogout, setSessionToLogout] = useState<ActiveSession | null>(null);
    const [ipInput, setIpInput] = useState("");
    const [copied, setCopied] = useState(false);

    const fetchSessions = async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        try {
            const res = await apiFetch("/api/auth/active-sessions");
            if (!res.ok) {
                throw new Error("Failed to fetch active sessions");
            }
            const data = await res.json();
            setSessions(data.sessions || []);
        } catch (error: any) {
            toast.error(error.message || "Could not retrieve sessions");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
        if (diffDays === 1) return "Yesterday";
        return `${diffDays} days ago`;
    };

    const handleOpenConfirmModal = (session: ActiveSession) => {
        setSessionToLogout(session);
        setIpInput("");
        setCopied(false);
        setIsConfirmModalOpen(true);
    };

    const handleCloseConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setSessionToLogout(null);
        setIpInput("");
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("IP Address copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleConfirmLogout = async () => {
        if (!sessionToLogout) return;

        const { id, isCurrent, ipAddress } = sessionToLogout;
        if (ipInput !== ipAddress) {
            toast.error("IP Address does not match");
            return;
        }

        setTerminatingId(id);
        try {
            const res = await apiFetch(`/api/auth/active-sessions?sessionId=${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to terminate session");
            }

            const data = await res.json();

            handleCloseConfirmModal();

            if (data.isCurrent || isCurrent) {
                toast.success("Current session terminated. Logging out...");
                clearAccessToken();
                setTimeout(() => {
                    window.location.href = "/login";
                }, 800);
            } else {
                toast.success("Session terminated successfully");
                setSessions(prev => prev.filter(s => s.id !== id));
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to log out session");
        } finally {
            setTerminatingId(null);
        }
    };

    // Filter and paginate sessions
    const filteredSessions = useMemo(() => {
        return sessions.filter(session => {
            const ipMatches = session.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
            const deviceMatches = session.deviceName.toLowerCase().includes(searchQuery.toLowerCase());
            const uaMatches = session.userAgent.toLowerCase().includes(searchQuery.toLowerCase());
            return ipMatches || deviceMatches || uaMatches;
        });
    }, [sessions, searchQuery]);

    const paginatedSessions = useMemo(() => {
        const size = parseInt(pageSize, 10);
        return filteredSessions.slice(0, size);
    }, [filteredSessions, pageSize]);

    // Simple parser for clean OS/browser rendering
    const getCleanDevice = (ua: string, devName: string) => {
        if (devName && devName !== "unknown" && devName !== "Other") {
            return devName;
        }

        let os = "Unknown OS";
        let browser = "Web Browser";

        // Detect OS
        if (ua.includes("Windows")) os = "Windows PC";
        else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "Mac";
        else if (ua.includes("Linux")) os = "Linux PC";
        else if (ua.includes("Android")) os = "Android Phone";
        else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iPhone/iPad";

        // Detect Browser
        if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
        else if (ua.includes("Edge")) browser = "Edge";

        return `${os} (${browser})`;
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Breadcrumbs */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Active Sessions</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Main Section */}
                <Card className="border border-border/40 shadow-xl overflow-hidden bg-card/65 backdrop-blur-md">
                    <CardHeader className="border-b border-border/30 pb-6 pt-6 px-6 sm:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Active Sessions</CardTitle>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                                                        <Info className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>

                                                <TooltipContent
                                                    side="bottom"
                                                    className="max-w-xs bg-popover text-popover-foreground border border-border text-xs p-3"
                                                >
                                                    These are the devices that have logged into your account. You can log out of any active session to secure your account.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <CardDescription className="text-sm mt-1 text-muted-foreground">
                                        Manage your login sessions across devices
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center justify-end sm:justify-start">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fetchSessions(true)}
                                    disabled={refreshing || loading}
                                    className="h-10 w-10 border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-6 sm:p-8 space-y-6">
                        {/* Controls row */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/75" />
                                <Input
                                    placeholder="Search by IP address or device name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-11 border-border/40 bg-muted/10 placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                <Select
                                    value={pageSize}
                                    onValueChange={setPageSize}
                                >
                                    <SelectTrigger className="w-[120px] h-11 border-border/40 bg-muted/10">
                                        <SelectValue placeholder="10 rows" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border border-border">
                                        <SelectItem value="5">5 rows</SelectItem>
                                        <SelectItem value="10">10 rows</SelectItem>
                                        <SelectItem value="25">25 rows</SelectItem>
                                        <SelectItem value="50">50 rows</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Table */}
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground animate-pulse">Loading active sessions...</p>
                            </div>
                        ) : paginatedSessions.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-border/40 rounded-xl bg-muted/5">
                                <Shield className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
                                <h3 className="font-semibold text-foreground text-base">No active sessions found</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                    {searchQuery ? "Try checking your spelling or search terms." : "No sessions are registered for your account."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-border/30 rounded-xl bg-muted/5 shadow-inner">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border/40 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                            <th className="py-4 px-6">Device</th>
                                            <th className="py-4 px-6">IP Address</th>
                                            <th className="py-4 px-6">Status</th>
                                            <th className="py-4 px-6">Time</th>
                                            <th className="py-4 px-6 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20 text-sm">
                                        {paginatedSessions.map((session) => (
                                            <tr
                                                key={session.id}
                                                className={`hover:bg-muted/10 transition-colors ${session.isCurrent ? "bg-primary/[0.02]" : ""
                                                    }`}
                                            >
                                                {/* Device */}
                                                <td className="py-5 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg shrink-0 ${session.isCurrent
                                                            ? "bg-primary/10 text-primary border border-primary/20"
                                                            : "bg-muted/40 text-muted-foreground border border-border/20"
                                                            }`}>
                                                            {session.userAgent.toLowerCase().includes("mobi") ? (
                                                                <Smartphone className="w-4 h-4" />
                                                            ) : (
                                                                <Laptop className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <p className="font-semibold text-foreground truncate cursor-help max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">
                                                                            {getCleanDevice(session.userAgent, session.deviceName)}
                                                                        </p>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="bg-popover text-popover-foreground border border-border max-w-md p-2 text-[10px] break-all leading-normal">
                                                                        {session.userAgent}
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px] sm:max-w-sm">
                                                                ID: {session.id}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* IP Address */}
                                                <td className="py-5 px-6 font-mono text-xs text-foreground/90 font-medium">
                                                    {session.ipAddress}
                                                </td>

                                                {/* Status */}
                                                <td className="py-5 px-6">
                                                    {session.isCurrent ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            Active (Current)
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                            Active
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Time */}
                                                <td className="py-5 px-6 text-muted-foreground text-xs font-medium">
                                                    {formatRelativeTime(session.lastActivity)}
                                                </td>

                                                {/* Action */}
                                                <td className="py-5 px-6 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        disabled={terminatingId === session.id}
                                                        onClick={() => handleOpenConfirmModal(session)}
                                                        className={`h-9 px-3 text-xs font-semibold rounded-lg transition-all hover:bg-destructive/10 hover:text-destructive border border-transparent ${session.isCurrent
                                                            ? "text-destructive/80 hover:border-destructive/20"
                                                            : "text-muted-foreground hover:border-destructive/10"
                                                            }`}
                                                    >
                                                        {terminatingId === session.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                                        ) : (
                                                            <LogOut className="w-3.5 h-3.5 mr-1" />
                                                        )}
                                                        Logout
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Log Out Active Session Confirmation Modal */}
            {isConfirmModalOpen && sessionToLogout && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div
                        className="bg-[#0f0f0f] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 origin-center text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Warning Icon */}
                        <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold tracking-tight text-white">Log Out Active Session</h3>
                            <p className="text-sm text-white/50">Enter the User IP to confirm logout.</p>
                        </div>

                        {/* IP Box with Copy Icon */}
                        <div className="flex items-center justify-center gap-2">
                            <div className="bg-white/[0.02] border border-white/[0.08] px-4 py-2 rounded-xl flex items-center gap-3 font-mono text-sm text-red-500 font-bold tracking-wide">
                                <span>{sessionToLogout.ipAddress}</span>
                                <button
                                    onClick={() => copyToClipboard(sessionToLogout.ipAddress)}
                                    className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md"
                                    title="Copy IP Address"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Subtext and Input Field */}
                        <div className="space-y-3 text-left">
                            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block text-center">
                                Type "{sessionToLogout.ipAddress}" to confirm
                            </label>
                            <Input
                                placeholder="Enter IP Address"
                                value={ipInput}
                                onChange={(e) => setIpInput(e.target.value)}
                                className="h-11 border-white/[0.08] bg-white/[0.02] text-center font-mono text-white text-sm focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-red-500/50"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={handleCloseConfirmModal}
                                className="flex-1 h-11 bg-transparent hover:bg-white/5 border border-white/[0.12] hover:border-white/[0.2] transition-colors rounded-xl text-sm font-semibold text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmLogout}
                                disabled={ipInput !== sessionToLogout.ipAddress || terminatingId !== null}
                                className="flex-1 h-11 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 transition-colors rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                            >
                                {terminatingId ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <LogOut className="w-4 h-4" />
                                )}
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
