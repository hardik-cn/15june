"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { UserPlus, Crown, Trash2, Pencil, X, RefreshCw, Users, Clock, Mail, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/app/components/ui/checkbox";
import { apiFetch } from "@/lib/apiFetch";

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
                                <Button className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Invite New User
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[480px]">
                                <DialogHeader>
                                    <DialogTitle>Invite New User</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleInviteUser} className="space-y-4 pt-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="invite-email">Email Address</Label>
                                        <Input
                                            id="invite-email"
                                            type="email"
                                            placeholder="user@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Permissions</Label>

                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="all-perms"
                                                checked={allPermissions}
                                                onCheckedChange={() => setAllPermissions(true)}
                                            />
                                            <label htmlFor="all-perms" className="cursor-pointer text-sm">
                                                All Permissions
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="choose-perms"
                                                checked={!allPermissions}
                                                onCheckedChange={() => setAllPermissions(false)}
                                            />
                                            <label htmlFor="choose-perms" className="cursor-pointer text-sm">
                                                Choose Permissions
                                            </label>
                                        </div>

                                        {!allPermissions && permissionsList.length > 0 && (
                                            <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto rounded-md border p-3">
                                                {permissionsList.map((perm) => (
                                                    <div key={perm.key} className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`perm-${perm.key}`}
                                                            checked={selectedPermissions.includes(perm.key)}
                                                            onCheckedChange={() =>
                                                                togglePerm(perm.key, selectedPermissions, setSelectedPermissions)
                                                            }
                                                        />
                                                        <label htmlFor={`perm-${perm.key}`} className="text-xs cursor-pointer">
                                                            {perm.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setInviteOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={inviteLoading}
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                        >
                                            {inviteLoading ? "Sending..." : "Send Invitation"}
                                        </Button>
                                    </DialogFooter>
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
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>
                            Edit Permissions — {editingUser?.firstname} {editingUser?.lastname}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-2 py-2">
                        {permissionsList.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No permissions available</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto rounded-md border p-3">
                                {permissionsList.map((perm) => (
                                    <div key={perm.key} className="flex items-center gap-2">
                                        <Checkbox
                                            id={`edit-perm-${perm.key}`}
                                            checked={editPermissions.includes(perm.key)}
                                            onCheckedChange={() =>
                                                togglePerm(perm.key, editPermissions, setEditPermissions)
                                            }
                                        />
                                        <label htmlFor={`edit-perm-${perm.key}`} className="text-xs cursor-pointer">
                                            {perm.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdatePermissions}
                            disabled={editLoading}
                        >
                            {editLoading ? "Saving…" : "Save Permissions"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}