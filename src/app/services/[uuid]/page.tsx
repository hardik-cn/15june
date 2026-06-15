"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import {
  ChevronRight,
  ExternalLink,
  HardDrive,
  Activity,
  ShieldCheck,
  Globe,
  Settings,
  XCircle,
  KeyRound,
  Mail,
  Zap,
  FolderOpen,
  Database,
  BarChart,
  Users,
  Loader2,
  AlertCircle,
  Server,
  CreditCard,
  CalendarDays,
  Tag,
  Wifi,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";

export default function ServiceDetailsPage() {
  const params = useParams();
  const uuid = params.uuid as string;

  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await apiFetch(`/api/whmcs/products/details/${uuid}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load service details");
          return;
        }

        setService(data.service);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [uuid]);

  // Disk and BW usage helpers
  const diskUsed = parseFloat(service?.diskUsage) || 0;
  const diskLimit = parseFloat(service?.diskLimit) || 0;
  const bwUsed = parseFloat(service?.bwUsage) || 0;
  const bwLimit = parseFloat(service?.bwLimit) || 0;

  const diskPercent = diskLimit > 0 ? Math.min((diskUsed / diskLimit) * 100, 100) : 0;
  const bwPercent = bwLimit > 0 ? Math.min((bwUsed / bwLimit) * 100, 100) : 0;

  // SVG circle helpers (r=40 → circumference = 2π*40 ≈ 251.2)
  const CIRC = 251.2;
  const diskOffset = CIRC - (diskPercent / 100) * CIRC;
  const bwOffset = CIRC - (bwPercent / 100) * CIRC;

  const controlPanel = service.configOptions?.find((option: any) =>
    option.optionname?.toLowerCase().includes("control panel")
  );

  const supportedPanels = [
    "cpanel",
    "plesk",
  ];

  const hasControlPanel =
    controlPanel &&
    supportedPanels.some(panel =>
      controlPanel.optionvalue?.toLowerCase().includes(panel)
    );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !service) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-lg font-semibold">Failed to load service</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <Link href="/services">← Back to Services</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header & Breadcrumbs */}
        <div>
          <div className="flex items-center text-sm text-muted-foreground mb-2 gap-1.5">
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/services" className="hover:text-foreground transition-colors">My Products &amp; Services</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Product Details</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Manage Product</h1>
            <Badge
              variant={service.status === "Active" ? "default" : "secondary"}
              className={service.status === "Active" ? "bg-green-500/10 text-green-500 border-0 shadow-none" : ""}
            >
              {service.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">

            {/* Navigation Menu */}
            <div className="bg-card rounded-xl border overflow-hidden">
              {/* <div className="flex items-center gap-2 p-4 bg-muted/30 border-b">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">Overview</h3>
              </div>
              <div className="flex flex-col">
                <button className="text-left px-4 py-3 bg-primary/10 text-primary border-l-2 border-primary font-medium text-sm">
                  Information
                </button>
              </div> */}

              <div className="flex items-center gap-2 p-4 bg-muted/30 border-b">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">Actions</h3>
              </div>
              <div className="flex flex-col text-sm">
                {hasControlPanel && (
                  <a
                    href={`https://${service.serverHost}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-left px-4 py-3 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    Log in to Control Panel
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button className="flex items-center justify-between text-left px-4 py-3 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  Change Password
                  <KeyRound className="w-4 h-4" />
                </button>
                <button className="flex items-center justify-between text-left px-4 py-3 hover:bg-muted/50 transition-colors text-red-500/80 hover:text-red-500">
                  Request Cancellation
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Upsell - Spam Protection */}
            <div className="bg-card rounded-xl border p-5 flex flex-col items-center text-center space-y-4">
              <h4 className="font-medium text-sm w-full text-left text-muted-foreground mb-2">Get Spam Protection</h4>
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-sm text-blue-500 hover:underline cursor-pointer">
                Stop spam in its tracks with professional spam filtering
              </p>
              <Button variant="outline" className="w-full text-xs" size="sm">
                Learn more
              </Button>
            </div>

          </div>

          {/* Right Content Area */}
          <div className="lg:col-span-9 space-y-6">

            {/* Package & Usage Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Package / Domain */}
              <Card className="flex flex-col">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-medium">Package / Domain</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center p-8 space-y-4 text-center">
                  <div className="space-y-1">
                    <p className="italic text-muted-foreground">{service.groupName}</p>
                    <h2 className="text-xl font-bold tracking-tight">{service.name}</h2>
                    {service.domain && (
                      <p className="font-medium cursor-pointer transition-colors">
                        {service.domain}
                      </p>
                    )}
                    {service.username && (
                      <p className="text-xs text-muted-foreground">
                        Username: <span className="font-mono font-medium text-foreground">{service.username}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                    {service.domain && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://${service.domain}`} target="_blank" rel="noopener noreferrer">
                          Visit Website
                        </a>
                      </Button>
                    )}
                    {service.serverHost && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm border-0" asChild>
                        <a href={`https://${service.serverHost}`} target="_blank" rel="noopener noreferrer">
                          Control Panel
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Usage Statistics */}
              <Card className="flex flex-col">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-medium">Usage Statistics</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-8">

                    {/* Disk Usage */}
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5" /> Disk Usage
                      </span>
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                          <circle
                            cx="48" cy="48" r="40"
                            stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={CIRC}
                            strokeDashoffset={diskOffset}
                            className="text-green-500 transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute text-sm font-bold">
                          {diskLimit > 0 ? `${Math.round(diskPercent)}%` : diskUsed}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground text-center">
                        {diskUsed} MB / {diskLimit > 0 ? `${diskLimit} MB` : "Unlimited"}
                      </span>
                    </div>

                    {/* Bandwidth Usage */}
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-sm font-medium flex items-center gap-1">
                        <Wifi className="w-3.5 h-3.5" /> Bandwidth
                      </span>
                      <div className="relative w-24 h-24 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                          <circle
                            cx="48" cy="48" r="40"
                            stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={CIRC}
                            strokeDashoffset={bwOffset}
                            className="text-blue-500 transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute text-sm font-bold">
                          {bwLimit > 0 ? `${Math.round(bwPercent)}%` : bwUsed}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground text-center">
                        {bwUsed} MB / {bwLimit > 0 ? `${bwLimit} MB` : "Unlimited"}
                      </span>
                    </div>

                  </div>
                  <div className="text-center mt-6">
                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                      Live from WHMCS
                    </span>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Server Information */}
            {(service.serverName || service.serverHost || service.serverIp) && (
              <Card>
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Server className="w-4 h-4" /> Server Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {service.serverName && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Server Name</p>
                        <p className="font-medium text-sm">{service.serverName}</p>
                      </div>
                    )}
                    {service.serverHost && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Hostname</p>
                        <p className="font-medium text-sm font-mono">{service.serverHost}</p>
                      </div>
                    )}
                    {service.serverIp && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">IP Address</p>
                        <p className="font-medium text-sm font-mono">{service.serverIp}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Fields */}
            {service.customFields && service.customFields.length > 0 && (
              <Card>
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Custom Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {service.customFields.map((field: any, i: number) => (
                      <div key={i} className="flex justify-between items-start border-b pb-3 last:border-b-0 last:pb-0">
                        <span className="text-muted-foreground text-sm">{field.name}</span>
                        <span className="font-medium text-sm text-right max-w-[60%]">{field.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Config Options */}
            {service.configOptions && service.configOptions.length > 0 && (
              <Card>
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Configuration Options
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {service.configOptions.map((opt: any, i: number) => (
                      <div key={i} className="flex justify-between items-start border-b pb-3 last:border-b-0 last:pb-0">
                        <span className="text-muted-foreground text-sm">{opt.optionname || opt.name}</span>
                        <span className="font-medium text-sm text-right">{opt.optionvalue || opt.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Shortcuts */}
            <Card>
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-base font-medium">Quick Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <button className="flex flex-col items-center justify-center p-4 gap-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-12 h-12 bg-gradientBg border border-gradientBorder rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <Mail className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">Mail</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 gap-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-12 h-12 bg-gradientBg border border-gradientBorder rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <Zap className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">Applications</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 gap-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-12 h-12 bg-gradientBg border border-gradientBorder rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">File Manager</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 gap-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-12 h-12 bg-gradientBg border border-gradientBorder rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <Database className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">MySQL® Databases</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 gap-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-12 h-12 bg-gradientBg border border-gradientBorder rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <BarChart className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">Statistics</span>
                  </button>
                  <button className="flex flex-col items-center justify-center p-4 gap-3 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="w-12 h-12 bg-gradientBg border border-gradientBorder rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-medium">Users</span>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Billing Overview */}
            <Card>
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Billing Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  <div className="flex justify-between items-start border-b pb-3 md:border-b-0 md:pb-0">
                    <span className="text-muted-foreground text-sm">Recurring Amount</span>
                    <span className="font-medium text-sm text-right">
                      Rs. {parseFloat(service.recurringAmount || "0").toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start border-b pb-3 md:border-b-0 md:pb-0">
                    <span className="text-muted-foreground text-sm">First Payment</span>
                    <span className="font-medium text-sm text-right">
                      Rs. {parseFloat(service.firstPayment || "0").toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-start border-b pb-3 md:border-b-0 md:pb-0">
                    <span className="text-muted-foreground text-sm">Registration Date</span>
                    <span className="font-medium text-sm text-right">{service.regDate || "—"}</span>
                  </div>
                  <div className="flex justify-between items-start border-b pb-3 md:border-b-0 md:pb-0">
                    <span className="text-muted-foreground text-sm">Billing Cycle</span>
                    <span className="font-medium text-sm text-right">{service.billingCycle}</span>
                  </div>
                  <div className="flex justify-between items-start border-b pb-3 md:border-b-0 md:pb-0">
                    <span className="text-muted-foreground text-sm">Next Due Date</span>
                    <span className="font-medium text-sm text-right">{service.nextDueDate}</span>
                  </div>
                  <div className="flex justify-between items-start md:col-span-1">
                    <span className="text-muted-foreground text-sm">Payment Method</span>
                    <span className="font-medium text-sm text-right max-w-[55%]">{service.paymentMethodName || service.paymentMethod || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
