import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsClientDetails } from "@/lib/whmcs/client/getClientDetails";
import { callWhmcsApi } from "@/lib/whmcs";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const whmcsClientId = user.whmcsClientId;

        if (!whmcsClientId) {
            return NextResponse.json(
                {
                    error:
                        "No WHMCS client linked",
                },
                { status: 404 }
            );
        }

        // =========================
        // Run in Parallel
        // =========================

        const [clientDetails, settingsResults] = await Promise.all([
            getWhmcsClientDetails(whmcsClientId),
            Promise.all([
                callWhmcsApi("GetConfigurationValue", { setting: "CompanyName" }),
                callWhmcsApi("GetConfigurationValue", { setting: "InvoicePayTo" }),
            ]),
        ]);

        const settings = {
            CompanyName: settingsResults?.[0]?.value || "",
            InvoicePayTo: settingsResults?.[1]?.value || "",
        };

        return NextResponse.json({
            client: clientDetails,
            settings,
        });

    } catch (error: any) {
        return NextResponse.json(
            {
                error:
                    error.message ||
                    "Internal Server Error",
            },
            { status: 500 }
        );
    }
}