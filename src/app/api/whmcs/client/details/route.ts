// src/app/api/whmcs/client/details/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsClientDetails, updateWhmcsClientDetails } from "@/lib/whmcs/client/getClientDetails";

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
                { error: "No WHMCS client linked" },
                { status: 404 }
            );
        }

        const details = await getWhmcsClientDetails(whmcsClientId);

        return NextResponse.json(details);

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user || !user.whmcsClientId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        await updateWhmcsClientDetails({
            clientId: user.whmcsClientId,
            emailMarketing: body.emailMarketing,
            generalEmails: body.emailPreferences?.general,
            invoiceEmails: body.emailPreferences?.invoice,
            supportEmails: body.emailPreferences?.support,
            productEmails: body.emailPreferences?.product,
            domainEmails: body.emailPreferences?.domain,
            affiliateEmails: body.emailPreferences?.affiliate,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}