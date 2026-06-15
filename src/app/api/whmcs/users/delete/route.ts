import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callWhmcsApi } from "@/lib/whmcs";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();

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

        await callWhmcsApi("DeleteUserClient", {
            user_id: userId,
            client_id: clientId,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}