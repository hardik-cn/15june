import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsEmailHistory } from "@/lib/whmcs/client/emails/getEmailHistory";
import { z } from "zod";

const emailHistorySchema = z.object({
    limitStart: z.coerce.number().int().nonnegative().default(0),
    limitNum: z.coerce.number().int().positive().default(25),
});

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
        const limitStartParam = searchParams.get("limitStart");
        const limitNumParam = searchParams.get("limitNum");

        const parsed = emailHistorySchema.safeParse({
            limitStart: limitStartParam !== null ? limitStartParam : undefined,
            limitNum: limitNumParam !== null ? limitNumParam : undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { limitStart, limitNum } = parsed.data;

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