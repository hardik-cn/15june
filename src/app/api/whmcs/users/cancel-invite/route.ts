import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callWhmcsApi } from "@/lib/whmcs";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function POST(req: Request) {
    try {

        // Authenticate user via JWT
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
            },
        });

        const clientId = fullUser?.onboarding?.whmcsClientId;

        const { invitationId, email } = await req.json();

        // ── 1. Try to cancel in WHMCS (best-effort, may not have an active invite record) ──
        if (invitationId) {
            try {
                await callWhmcsApi("DeleteUserClient", {
                    user_id: invitationId,
                    client_id: clientId,
                });
            } catch (e: any) {
                // Not fatal — pending invites may not have a userId in WHMCS yet
                console.warn("WHMCS cancel invite warning:", e.message);
            }
        }

        // ── 2. Remove from our local DB 
        if (clientId && email) {
            await db.userInvitation.deleteMany({
                where: {
                    whmcsClientId: clientId,
                    email,
                },
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("CANCEL INVITE ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}