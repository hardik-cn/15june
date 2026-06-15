import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsEmailHistory } from "@/lib/whmcs/client/emails/getEmailHistory";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user || !user.whmcsClientId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);

        const limitStart = parseInt(searchParams.get("limitStart") ?? "0", 10);
        const limitNum = parseInt(searchParams.get("limitNum") ?? "25", 10);

        const result = await getWhmcsEmailHistory(
            user.whmcsClientId,
            limitStart,
            limitNum
        );

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Error fetching WHMCS email history:", error);

        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}