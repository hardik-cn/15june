import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsClientDetails, updateWhmcsClientDetails } from "@/lib/whmcs/client/getClientDetails";
import { z } from "zod";

const updateClientDetailsSchema = z.object({
    emailMarketing: z.boolean().optional(),
    emailPreferences: z.object({
        general: z.boolean().optional(),
        invoice: z.boolean().optional(),
        support: z.boolean().optional(),
        product: z.boolean().optional(),
        domain: z.boolean().optional(),
        affiliate: z.boolean().optional(),
    }).optional(),
});

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

        let body;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const parsed = updateClientDetailsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const data = parsed.data;

        await updateWhmcsClientDetails({
            clientId: user.whmcsClientId,
            emailMarketing: data.emailMarketing,
            generalEmails: data.emailPreferences?.general,
            invoiceEmails: data.emailPreferences?.invoice,
            supportEmails: data.emailPreferences?.support,
            productEmails: data.emailPreferences?.product,
            domainEmails: data.emailPreferences?.domain,
            affiliateEmails: data.emailPreferences?.affiliate,
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}