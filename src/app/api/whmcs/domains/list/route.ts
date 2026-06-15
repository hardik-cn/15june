// src/app/api/whmcs/domains/list/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getClientsDomains } from "@/lib/whmcs/domain/GetClientsDomains";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const fullUser = await db.user.findUnique({
            where: { id: user.id },
            include: { onboarding: true },
        });

        const clientId = fullUser?.onboarding?.whmcsClientId;
        if (!clientId) {
            return NextResponse.json({ error: "No WHMCS client ID found" }, { status: 400 });
        }

        const { domains, total } = await getClientsDomains(clientId);


        return NextResponse.json({ domains, total });
    } catch (error: any) {
        console.error("GetClientsDomains error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
