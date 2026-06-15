import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const settings = ["CompanyName", "InvoicePayTo"] as const;

        const results = await Promise.all(
            settings.map(async (setting) => {
                const res = await callWhmcsApi("GetConfigurationValue", { setting });
                const value = (res as any).value;
                return [setting, typeof value === "string" ? value : String(value ?? "")] as const;
            })
        );

        return NextResponse.json(Object.fromEntries(results));
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}