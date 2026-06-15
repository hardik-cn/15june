// src/app/admin/dashboard/page.tsx

"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import AdminDashboardWrapper from "../components/AdminDashboardWrapper";
import { ADMIN_ROUTES } from "@/lib/routes";
import { adminFetch } from "@/lib/admin/adminFetch";
const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
};
// Stats Card Component
const StatsCard = ({ title, value, icon, }: { title: string; value: string; icon: React.ReactNode; }) => (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] p-6 hover:border-white/[0.15] transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-white/10 to-transparent opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity duration-500" />
        <div className="relative">
            <div className="flex items-center justify-between mb-4">
                <span className="text-white/50 text-sm font-medium">{title}</span>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/[0.08]">
                    {icon}
                </div>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-4xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent mb-1">{value}</p>
                    {/* <p className={`text-sm font-medium ${changeType === "up" ? "text-white/60" : "text-white/40"}`}>
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full mr-1 ${changeType === "up" ? "bg-white/10" : "bg-white/5"}`}>
                            {changeType === "up" ? "↑" : "↓"}
                        </span>
                        {change} from last month
                    </p> */}
                </div>
            </div>
        </div>
    </div>
);
// Quick Action Card
const QuickAction = ({ title, description, href, icon, }: { title: string; description: string; href: string; icon: React.ReactNode; }) => (
    <Link
        href={href}
        className="group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300"
    >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/[0.08] group-hover:scale-110 group-hover:border-white/[0.15] transition-all duration-300">
            {icon}
        </div>
        <div className="flex-1">
            <h3 className="font-semibold text-white group-hover:text-white transition-colors">{title}</h3>
            <p className="text-white/40 text-sm">{description}</p>
        </div>
        <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    </Link>
);
// Recent Activity Item
const ActivityItem = ({ user, action, time, status, }: { user: string; action: string; time: string; status: "approved" | "rejected" | "pending" | "pending_superadmin"; }) => {
    const statusConfig = {
        approved: {
            bg: "bg-gradient-to-r from-white/10 to-white/5",
            text: "text-white/70",
            border: "border-white/[0.15]",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            ),
        },
        rejected: {
            bg: "bg-gradient-to-r from-white/5 to-white/[0.02]",
            text: "text-white/50",
            border: "border-white/[0.08]",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
            ),
        },
        pending: {
            bg: "bg-gradient-to-r from-white/[0.08] to-white/[0.03]",
            text: "text-white/60",
            border: "border-white/[0.1]",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            ),
        },
        pending_superadmin: {
            bg: "bg-gradient-to-r from-white/[0.08] to-white/[0.03]",
            text: "text-white/60",
            border: "border-white/[0.1]",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            ),
        },
    };
    const config = statusConfig[status];
    return (
        <div className="flex items-center gap-4 py-4 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] px-3 -mx-3 rounded-lg transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center flex-shrink-0 border border-white/[0.1]">
                <span className="text-white/80 font-semibold text-sm">
                    {user.split(" ").map(n => n[0]).join("")}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-white/90 font-medium truncate">{user}</p>
                <p className="text-white/40 text-sm truncate">{action}</p>
            </div>
            <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
                    {config.icon}
                    {status === "pending_superadmin" ? "Pending Approval" : status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
                <p className="text-white/30 text-xs mt-1">{time}</p>
            </div>
        </div>
    );
};
export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        pendingKyc: 0,
        approvedKyc: 0,
        rejectedKyc: 0,
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetched = React.useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetchStats = async () => {
            try {
                const res = await adminFetch("/api/admin/dashboard/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                    setRecentActivity(data.recentActivity);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);
    return (
        <AdminDashboardWrapper>
            <div className="space-y-8">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent mb-2">Dashboard Overview</h1>
                    <p className="text-white/40">Monitor your KYC verifications and user management.</p>
                </div>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatsCard
                        title="Total Users"
                        value={isLoading ? "..." : stats.totalUsers.toLocaleString()}
                        // change="12.5%"
                        // changeType="up"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Pending KYC"
                        value={isLoading ? "..." : stats.pendingKyc.toLocaleString()}
                        // change="8.2%"
                        // changeType="up"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Approved"
                        value={isLoading ? "..." : stats.approvedKyc.toLocaleString()}
                        // change="18.3%"
                        // changeType="up"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        }
                    />
                    <StatsCard
                        title="Rejected"
                        value={isLoading ? "..." : stats.rejectedKyc.toLocaleString()}
                        // change="3.1%"
                        // changeType="down"
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" x2="9" y1="9" y2="15" />
                                <line x1="9" x2="15" y1="9" y2="15" />
                            </svg>
                        }
                    />
                </div>
                {/* Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Recent Activity</h2>
                            <Link
                                href={ADMIN_ROUTES.KYC.PENDING}
                                className="text-sm text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
                            >
                                View all
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14" />
                                    <path d="m12 5 7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-[#141414] to-[#0f0f0f] border border-white/[0.08] p-6">
                            {isLoading ? (
                                <div className="text-white/50 text-center py-4">Loading activity...</div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-white/50 text-center py-4">No recent activity</div>
                            ) : (
                                recentActivity.map((activity, index) => (
                                    <ActivityItem
                                        key={activity.id || index}
                                        user={activity.user}
                                        action={activity.action}
                                        time={formatRelativeTime(activity.time)}
                                        status={activity.status}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div >
        </AdminDashboardWrapper >
    );
}