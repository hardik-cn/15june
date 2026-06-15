import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callWhmcsApi } from "@/lib/whmcs";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function GET(req: Request) {
    try {

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const fullUser = await db.user.findUnique({
            where: { id: user.id },
            include: {
                onboarding: true,
                sessions: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });

        const clientId = fullUser?.onboarding?.whmcsClientId;

        if (!clientId) {
            return NextResponse.json(
                { error: "No WHMCS client ID found" },
                { status: 400 }
            );
        }

        // ── Owner ─────────────────────────────────────
        const owner = {
            id: "owner",
            firstname: fullUser?.firstName ?? "",
            lastname: fullUser?.lastName ?? "",
            email: fullUser?.email ?? "",
            lastLogin: fullUser?.sessions?.[0]?.createdAt ?? null,
        };

        // ── WHMCS Users ───────────────────────────────
        let activeUsers: any[] = [];

        try {

            const resultAll = await callWhmcsApi("GetUsers", {
                limitnum: 500,
            });

            const rawAll: any[] = (() => {
                const direct = resultAll?.users;
                if (Array.isArray(direct)) return direct;

                const nested = resultAll?.users?.user;
                if (!nested) return [];

                return Array.isArray(nested) ? nested : [nested];
            })();

            activeUsers = rawAll
                .filter((u: any) => {

                    if (u.email === owner.email) return false;

                    const clientList = normalizeClientList(u.clients);

                    const match = clientList.find(
                        (c: any) => Number(c.id) === Number(clientId)
                    );

                    return !!match;
                })
                .map((u: any) => ({
                    id: String(u.id ?? ""),
                    firstname: u.firstname ?? "",
                    lastname: u.lastname ?? "",
                    email: u.email ?? "",
                    lastLogin: u.last_login ?? u.lastlogin ?? null,
                    permissions: parsePermissions(u, clientId),
                }));

            if (activeUsers.length > 0) {
                await db.userInvitation.deleteMany({
                    where: {
                        whmcsClientId: clientId,
                        email: { in: activeUsers.map((u) => u.email) },
                    },
                });
            }

        } catch (e: any) {
            console.error("WHMCS GetUsers ERROR:", e.message);
        }

        // ── Pending Invitations ───────────────────────
        const pendingInvites = await db.userInvitation.findMany({
            where: { whmcsClientId: clientId },
            orderBy: { sentAt: "desc" },
        });

        return NextResponse.json(
            {
                owner,
                users: activeUsers,
                invitations: pendingInvites,
            },
            {
                headers: { "Cache-Control": "no-store, max-age=0" },
            }
        );

    } catch (error: any) {

        console.error("USER FETCH ERROR:", error);

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeClientList(clients: any): any[] {
    if (!clients) return [];
    return Array.isArray(clients) ? clients : [clients];
}

function parsePermissions(u: any, clientId: number): string[] {
    // Try top-level permissions field first
    if (u.permissions) {
        return String(u.permissions).split(",").map((p: string) => p.trim()).filter(Boolean);
    }
    // Fall back to permissions inside the clients array entry for this clientId
    // Raw JSON from WHMCS: u.clients is a direct array (not u.clients.client)
    const clientList = normalizeClientList(u.clients);
    const match = clientList.find((c: any) => Number(c.id) === Number(clientId));
    if (match?.permissions) {
        return String(match.permissions).split(",").map((p: string) => p.trim()).filter(Boolean);
    }
    return [];
}