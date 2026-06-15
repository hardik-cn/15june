// src/app/account-details/page.tsx
"use client";

import { useState } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";
import { AccountDetailsTab } from "./components/AccountDetailsTab";
import { ContactsTab } from "./components/ContactsTab";
import { EmailHistoryTab } from "./components/EmailHistoryTab";
import { User, Users, Mail } from "lucide-react";

type Tab = "account-details" | "contacts" | "email-history";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
        id: "account-details",
        label: "Account Details",
        icon: <User className="h-4 w-4" />,
    },
    {
        id: "contacts",
        label: "Contacts",
        icon: <Users className="h-4 w-4" />,
    },
    {
        id: "email-history",
        label: "Email History",
        icon: <Mail className="h-4 w-4" />,
    },
];

export default function AccountDetailsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("account-details");

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Breadcrumb */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Account Details</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Main layout: sidebar + content */}
                <div className="flex gap-6 items-start">
                    {/* Sidebar */}
                    <aside className="w-52 flex-shrink-0">
                        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                            <div className="px-4 py-3 border-b border-border/60 bg-muted/30">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                    Account
                                </p>
                            </div>
                            <nav className="py-1.5">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        id={`sidebar-tab-${tab.id}`}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${activeTab === tab.id
                                            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent"
                                            }`}
                                    >
                                        <span
                                            className={
                                                activeTab === tab.id
                                                    ? "text-primary"
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {tab.icon}
                                        </span>
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    {/* Tab Content */}
                    <div className="flex-1 min-w-0">
                        {activeTab === "account-details" && <AccountDetailsTab />}
                        {activeTab === "contacts" && <ContactsTab />}
                        {activeTab === "email-history" && <EmailHistoryTab />}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
