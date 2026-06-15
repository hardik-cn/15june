// app/api/whmcs/billing/invoices/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsInvoices } from "@/lib/whmcs/billing/getinvoices";
import { attachUuidToInvoices } from "@/lib/whmcs/billing/invoiceMapper";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);

        const orderbyParam =
            searchParams.get("orderby") || "invoicenumber";

        const orderParam =
            searchParams.get("order") || "DESC";

        const orderbyAllowed = new Set([
            "invoicenumber",
            "id",
            "date",
            "duedate",
            "status",
            "total",
        ]);

        const orderAllowed = new Set([
            "ASC",
            "DESC",
        ]);

        const orderby = orderbyAllowed.has(orderbyParam)
            ? orderbyParam
            : "invoicenumber";

        const order = orderAllowed.has(orderParam)
            ? orderParam
            : "DESC";

        const whmcsClientId = (user as any)?.whmcsClientId;

        if (!whmcsClientId) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 400 }
            );
        }

        const data = await getWhmcsInvoices({
            userid: whmcsClientId,
            order: order as any,
        });

        if (data.result !== "success") {
            return NextResponse.json(
                { error: "Failed to get invoices" },
                { status: 500 }
            );
        }

        const invoices = data.invoices?.invoice || [];

        const invoicesWithUuid =
            await attachUuidToInvoices(
                invoices,
                String(user.id)
            );

        const safeInvoices = invoicesWithUuid.map((inv) => ({
            id: inv.uuid,
            invoiceid: inv.id,
            invoicenum: inv.invoicenum,
            date: inv.date,
            duedate: inv.duedate,
            total: inv.total,
            status: inv.status,
        }));

        return NextResponse.json({
            totalresults: data.totalresults,
            invoices: safeInvoices,
        });

    } catch (error: any) {
        console.error(
            "GET /api/whmcs/billing/invoices error:",
            error
        );

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}