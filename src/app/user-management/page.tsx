"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import {
    UserPlus, Crown, Trash2, Pencil, X, RefreshCw, Users, Clock, Mail, Loader2,
    User, Server, KeyRound, ExternalLink, Globe, Settings2, CreditCard,
    FileCheck2, LifeBuoy, TrendingUp, ShoppingCart, ShieldCheck, ShieldAlert,
    Check
} from "lucide-react";
import { toast } from "sonner";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/app/components/ui/breadcrumb";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveUser {
    id: string;
    firstname: string;
    lastname: string;
    email: string;
    isOwner: boolean;
    lastLogin: string | null;
    permissions: string[];
}

interface PendingInvite {
    id: number;
    email: string;
    sentAt: string;        // from our UserInvitation DB model
    permissions?: string;
}

interface PermissionItem {
    key: string;
    label: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(firstname: string, lastname: string) {
    return `${firstname?.[0] ?? ""}${lastname?.[0] ?? ""}`.toUpperCase();
}

function formatDate(d: string | null | undefined) {
    if (!d) return "Never";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d; // already a string like "1 hour ago"
    return dt.toLocaleString();
}

const PERMISSION_DETAILS: Record<string, { title: string; description: string; icon: any }> = {
    profile: {
        title: "Modify Master Account Profile",
        description: "Access and modify the client profile information",
        icon: User,
    },
    contacts: {
        title: "View & Manage Contacts",
        description: "Access and manage contacts",
        icon: Users,
    },
    products: {
        title: "View Products & Services",
        description: "View access to products, services and addons",
        icon: Server,
    },
    manageproducts: {
        title: "View & Modify Product Passwords",
        description: "Allow password resets and other actions",
        icon: KeyRound,
    },
    productsso: {
        title: "Perform Single Sign-On",
        description: "Allow single sign-on into services",
        icon: ExternalLink,
    },
    domains: {
        title: "View Domains",
        description: "View access to domain registrations",
        icon: Globe,
    },
    managedomains: {
        title: "Manage Domain Settings",
        description: "Allow domain management eg. nameservers/whois/transfers",
        icon: Settings2,
    },
    invoices: {
        title: "View & Pay Invoices",
        description: "View and payment access to invoices",
        icon: CreditCard,
    },
    quotes: {
        title: "View & Accept Quotes",
        description: "View and acceptance permissions for quotes",
        icon: FileCheck2,
    },
    tickets: {
        title: "View & Open Support Tickets",
        description: "Access to open, respond and manage support tickets",
        icon: LifeBuoy,
    },
    affiliates: {
        title: "View & Manage Affiliate Account",
        description: "Access to view and request withdrawals",
        icon: TrendingUp,
    },
    emails: {
        title: "View Emails",
        description: "Access to view account email history",
        icon: Mail,
    },
    orders: {
        title: "Place New Orders/Upgrades/Cancellations",
        description: "Allow placing of new orders",
        icon: ShoppingCart,
    },
};

function getPermissionDetail(key: string, fallbackLabel: string) {
    const cleanKey = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const foundEntry = Object.entries(PERMISSION_DETAILS).find(([k]) => {
        return k.toLowerCase() === cleanKey;
    });

    if (foundEntry) {
        return foundEntry[1];
    }

    return {
        title: fallbackLabel || key,
        description: "Granted permission for this feature",
        icon: ShieldCheck,
    };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function UserManagement() {
    const [users, setUsers] = useState<ActiveUser[]>([]);
    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);

    // Invite dialog
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [allPermissions, setAllPermissions] = useState(true);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [inviteLoading, setInviteLoading] = useState(false);

    // Edit permissions dialog
    const [editingUser, setEditingUser] = useState<ActiveUser | null>(null);
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [editLoading, setEditLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────

    const fetchUsers = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await apiFetch("/api/whmcs/users");
            const data = await res.json();

            if (data.error) {
                if (!silent) toast.error(data.error);
                return;
            }

            // Build users list: owner first, then active sub-users
            const owner: ActiveUser = {
                id: "owner",
                firstname: data.owner?.firstname ?? "",
                lastname: data.owner?.lastname ?? "",
                email: data.owner?.email ?? "",
                isOwner: true,
                lastLogin: data.owner?.lastLogin ?? null,
                permissions: [],
            };

            const others: ActiveUser[] = (data.users ?? []).map((u: any) => ({
                id: String(u.id ?? u.userid ?? ""),
                firstname: u.firstname ?? "",
                lastname: u.lastname ?? "",
                email: u.email ?? "",
                isOwner: false,
                lastLogin: u.last_login ?? u.lastlogin ?? null,
                permissions: u.permissions
                    ? String(u.permissions).split(",").map((p: string) => p.trim()).filter(Boolean)
                    : [],
            }));

            setUsers([owner, ...others]);
            setPendingInvites(data.invitations ?? []);

            // Log raw for debugging
            if (data._raw) {
                console.log("[UserMgmt] Raw WHMCS GetUsers:", data._raw);
            }
        } catch {
            if (!silent) toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPermissions = async () => {
        try {
            const res = await apiFetch("/api/whmcs/users/permissions");
            const data = await res.json();
            if (Array.isArray(data)) setPermissionsList(data);
        } catch {
            // non-fatal
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchPermissions();

        // ── Real-time polling every 15 seconds ──
        pollingRef.current = setInterval(() => {
            fetchUsers(true); // silent = no loading spinner
        }, 15_000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [fetchUsers]);

    // ── Actions ────────────────────────────────────────────────────────────

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            const permissions = allPermissions
                ? permissionsList.map((p) => p.key).join(",")
                : selectedPermissions.join(",");

            const res = await apiFetch("/api/whmcs/users/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail, permissions }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast.success("Invitation sent successfully!");
            setInviteEmail("");
            setSelectedPermissions([]);
            setAllPermissions(true);
            setInviteOpen(false);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || "Invite failed");
        } finally {
            setInviteLoading(false);
        }
    };

    const handleCancelInvite = async (invite: PendingInvite) => {
        try {
            const res = await apiFetch("/api/whmcs/users/cancel-invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Send both id and email — API uses email as primary key in DB
                body: JSON.stringify({ invitationId: invite.id, email: invite.email }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success("Invitation cancelled");
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || "Cancel failed");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this user?")) return;
        try {
            const res = await apiFetch("/api/whmcs/users/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success("User removed");
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || "Delete failed");
        }
    };

    const openEditDialog = (user: ActiveUser) => {
        setEditingUser(user);
        setEditPermissions(user.permissions ?? []);
    };

    const handleUpdatePermissions = async () => {
        if (!editingUser) return;
        setEditLoading(true);
        try {
            const res = await apiFetch("/api/whmcs/users/update-permissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: editingUser.id,
                    permissions: editPermissions.join(","),
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            toast.success("Permissions updated");
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            toast.error(err.message || "Update failed");
        } finally {
            setEditLoading(false);
        }
    };

    const togglePerm = (key: string, current: string[], setter: (p: string[]) => void) => {
        setter(current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
    };

    // ── Render ─────────────────────────────────────────────────────────────

    const totalUsers = users.length;

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
                            <BreadcrumbPage>User Management</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                        {!loading && (
                            <p className="text-muted-foreground mt-1 text-sm">
                                {totalUsers} {totalUsers === 1 ? "User" : "Users"} Found
                            </p>
                        )}
                    </div>

                    {/* Refresh + Invite */}
                    <div className="flex items-center gap-2">
                        {/* Invite Dialog */}
                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Invite New User
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto p-0 border-none bg-background shadow-2xl rounded-xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                            <UserPlus className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-xl font-bold text-foreground">Invite New User</DialogTitle>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Send an invitation email to delegate account access with custom permissions.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleInviteUser} className="p-6 space-y-6">
                                    {/* Email Address Section */}
                                    <div className="space-y-2">
                                        <Label htmlFor="invite-email" className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            Email Address
                                        </Label>
                                        <Input
                                            id="invite-email"
                                            type="email"
                                            placeholder="user@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                            className="h-11 rounded-lg border-border focus-visible:ring-primary focus-visible:border-primary shadow-sm"
                                        />
                                        <p className="text-[11px] text-muted-foreground">
                                            We'll send an invitation link to this email address to create or link their account.
                                        </p>
                                    </div>

                                    {/* Permissions Configuration Section */}
                                    <div className="space-y-4 pt-2 border-t border-border">
                                        <div className="flex flex-col gap-1">
                                            <Label className="text-sm font-semibold text-foreground">Permission Type</Label>
                                            <p className="text-xs text-muted-foreground">Choose the level of access you want to grant to this user.</p>
                                        </div>

                                        {/* Selector cards */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Full Access card */}
                                            <div
                                                onClick={() => setAllPermissions(true)}
                                                className={cn(
                                                    "relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all select-none",
                                                    allPermissions
                                                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary shadow-sm"
                                                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                                                )}
                                            >
                                                <div className={cn("p-2 rounded-lg border", allPermissions ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border")}>
                                                    <Crown className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-sm text-foreground">All Permissions</p>
                                                    <p className="text-xs text-muted-foreground leading-normal">
                                                        Grants full administrative access to all areas of the account.
                                                    </p>
                                                </div>
                                                {allPermissions && (
                                                    <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                                                        <Check className="h-3 w-3 text-primary-foreground" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Custom Permissions card */}
                                            <div
                                                onClick={() => setAllPermissions(false)}
                                                className={cn(
                                                    "relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all select-none",
                                                    !allPermissions
                                                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary shadow-sm"
                                                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                                                )}
                                            >
                                                <div className={cn("p-2 rounded-lg border", !allPermissions ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border")}>
                                                    <Settings2 className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-sm text-foreground">Choose Permissions</p>
                                                    <p className="text-xs text-muted-foreground leading-normal">
                                                        Selectively configure access levels for specific actions.
                                                    </p>
                                                </div>
                                                {!allPermissions && (
                                                    <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                                                        <Check className="h-3 w-3 text-primary-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Custom Permissions Grid */}
                                        {!allPermissions && permissionsList.length > 0 && (
                                            <div className="space-y-2 pt-2">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Access Permissions</Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto rounded-xl border border-border p-4 bg-muted/20 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full pr-2">
                                                    {permissionsList.map((perm) => {
                                                        const detail = getPermissionDetail(perm.key, perm.label);
                                                        const IconComp = detail.icon;
                                                        const selected = selectedPermissions.includes(perm.key);
                                                        return (
                                                            <div
                                                                key={perm.key}
                                                                role="checkbox"
                                                                aria-checked={selected}
                                                                tabIndex={0}
                                                                onClick={() => togglePerm(perm.key, selectedPermissions, setSelectedPermissions)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === " " || e.key === "Enter") {
                                                                        e.preventDefault();
                                                                        togglePerm(perm.key, selectedPermissions, setSelectedPermissions);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                                                    selected
                                                                        ? "border-primary bg-primary/[0.02] shadow-sm"
                                                                        : "border-border bg-card hover:border-muted-foreground/30"
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "flex h-8 w-8 items-center justify-center rounded-lg border shrink-0",
                                                                    selected
                                                                        ? "bg-primary/10 text-primary border-primary/20"
                                                                        : "bg-muted text-muted-foreground border-border"
                                                                )}>
                                                                    <IconComp className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex-1 space-y-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-xs font-semibold text-foreground truncate">{detail.title}</span>
                                                                        <div className={cn(
                                                                            "h-4 w-4 rounded-full border shrink-0 flex items-center justify-center transition-all",
                                                                            selected
                                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                                : "border-muted-foreground/30 bg-transparent"
                                                                        )}>
                                                                            {selected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
                                                                        {detail.description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer actions */}
                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setInviteOpen(false)}
                                            className="h-10 px-5 rounded-lg"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={inviteLoading}
                                            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                                        >
                                            {inviteLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="h-4 w-4" />
                                                    Send Invitation
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* ── Active Users Card ── */}
                <Card className="border-border bg-card">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="py-12 text-center text-muted-foreground">
                                Loading users…
                            </div>
                        ) : users.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <Users className="h-10 w-10 opacity-30" />
                                <p>No users found</p>
                            </div>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between px-5 py-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                                >
                                    {/* Left: Avatar + Info */}
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-11 w-11 border-2 border-primary/30">
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                                {getInitials(user.firstname, user.lastname)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {user.firstname} {user.lastname}
                                                </span>
                                                {user.isOwner && (
                                                    <Crown className="h-4 w-4 text-yellow-500" />
                                                )}
                                            </div>
                                            <p className="text-sm text-primary">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Right: Last Login + Badge + Actions */}
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                                <Clock className="h-3 w-3" /> Last Login:
                                            </p>
                                            <p className="text-sm text-foreground">
                                                {formatDate(user.lastLogin)}
                                            </p>
                                        </div>

                                        {user.isOwner ? (
                                            <Badge variant="outline" className="min-w-[60px] justify-center">
                                                Owner
                                            </Badge>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                    onClick={() => openEditDialog(user)}
                                                    title="Edit permissions"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    title="Remove user"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                    * Account owners always have full permissions over a client account.
                </p>

                {/* ── Pending Invites Card ── */}
                {pendingInvites.length > 0 && (
                    <Card className="border-border bg-card">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Mail className="h-5 w-5 text-muted-foreground" />
                                Pending Invites
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingInvites.map((invite) => (
                                <div
                                    key={invite.id}
                                    className="flex items-center justify-between px-5 py-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                                >
                                    {/* Left: Avatar + Email */}
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-11 w-11 border-2 border-border">
                                            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                                                {invite.email?.[0]?.toUpperCase() ?? "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-foreground">
                                                {invite.email}
                                            </p>
                                            {invite.sentAt && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Invite Sent: {formatDate(invite.sentAt)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                            title="Resend invitation"
                                            onClick={async () => {
                                                toast.info("Resend not available via WHMCS API — cancel and re-invite.");
                                            }}
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                            title="Cancel invitation"
                                            onClick={() => handleCancelInvite(invite)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* ── Edit Permissions Dialog ── */}
            <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
                <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto p-0 border-none bg-background shadow-2xl rounded-xl [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                <Settings2 className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-foreground">
                                    Edit Permissions
                                </DialogTitle>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Manage access permissions for {editingUser?.firstname} {editingUser?.lastname} ({editingUser?.email}).
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {permissionsList.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                <ShieldAlert className="h-8 w-8 opacity-40" />
                                <p className="text-sm">No permissions available</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Access Permissions</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto rounded-xl border border-border p-4 bg-muted/20 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full pr-2">
                                    {permissionsList.map((perm) => {
                                        const detail = getPermissionDetail(perm.key, perm.label);
                                        const IconComp = detail.icon;
                                        const selected = editPermissions.includes(perm.key);
                                        return (
                                            <div
                                                key={perm.key}
                                                role="checkbox"
                                                aria-checked={selected}
                                                tabIndex={0}
                                                onClick={() => togglePerm(perm.key, editPermissions, setEditPermissions)}
                                                onKeyDown={(e) => {
                                                    if (e.key === " " || e.key === "Enter") {
                                                        e.preventDefault();
                                                        togglePerm(perm.key, editPermissions, setEditPermissions);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                                    selected
                                                        ? "border-primary bg-primary/[0.02] shadow-sm"
                                                        : "border-border bg-card hover:border-muted-foreground/30"
                                                )}
                                            >
                                                <div className={cn(
                                                    "flex h-8 w-8 items-center justify-center rounded-lg border shrink-0",
                                                    selected
                                                        ? "bg-primary/10 text-primary border-primary/20"
                                                        : "bg-muted text-muted-foreground border-border"
                                                )}>
                                                    <IconComp className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 space-y-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-semibold text-foreground truncate">{detail.title}</span>
                                                        <div className={cn(
                                                            "h-4 w-4 rounded-full border shrink-0 flex items-center justify-center transition-all",
                                                            selected
                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                : "border-muted-foreground/30 bg-transparent"
                                                        )}>
                                                            {selected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] leading-relaxed text-muted-foreground line-clamp-2">
                                                        {detail.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                            <Button variant="outline" onClick={() => setEditingUser(null)} className="h-10 px-5 rounded-lg">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdatePermissions}
                                disabled={editLoading}
                                className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
                            >
                                {editLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Permissions"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}