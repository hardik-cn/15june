// app/api/whmcs/billing/invoices/[uuid]/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsInvoice, getWhmcsInvoices, getWhmcsTransactions } from "@/lib/whmcs/billing/getinvoices";
import { getInvoiceIdFromUuid } from "@/lib/whmcs/billing/invoiceMapper";

export async function GET(
    req: Request,
    ctx: { params: Promise<{ uuid: string }> }
) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const whmcsClientId =
            (user as any)?.whmcsClientId;

        if (!whmcsClientId) {
            return NextResponse.json(
                { error: "WHMCS user id not linked" },
                { status: 400 }
            );
        }

        const { uuid } = await ctx.params;

        if (!uuid) {
            return NextResponse.json(
                { error: "Invoice uuid is required" },
                { status: 400 }
            );
        }

        const invoiceId =
            await getInvoiceIdFromUuid(
                uuid,
                String(user.id)
            );

        // Verify ownership
        const list = await getWhmcsInvoices({
            userid: whmcsClientId,
        });

        if (list.result !== "success") {
            return NextResponse.json(
                {
                    error:
                        "Failed to fetch invoices from WHMCS",
                },
                { status: 500 }
            );
        }

        const invoices =
            list.invoices?.invoice || [];

        const belongs = invoices.some(
            (inv) =>
                String(inv.id) ===
                String(invoiceId)
        );

        if (!belongs) {
            return NextResponse.json(
                { error: "Invoice not found" },
                { status: 404 }
            );
        }

        const full =
            await getWhmcsInvoice(invoiceId);

        if (full.result !== "success") {
            return NextResponse.json(
                {
                    error:
                        "Failed to fetch invoice from WHMCS",
                },
                { status: 500 }
            );
        }

        let rawTransactions =
            full.transactions?.transaction || [];

        if (rawTransactions.length === 0) {
            rawTransactions =
                await getWhmcsTransactions({
                    clientid: whmcsClientId,
                    invoiceid: invoiceId,
                });
        }

        const safeTransactions =
            rawTransactions.map((t: any) => ({
                id: t.id,
                invoiceid: t.invoiceid,
                date: t.date,
                gateway: t.gateway,
                transid: t.transid,
                amountin: t.amountin,
            }));

        const safe = {
            invoiceid: full.invoiceid,
            invoicenum: full.invoicenum,
            date: full.date,
            duedate: full.duedate,
            datepaid: full.datepaid,
            subtotal: full.subtotal,
            credit: full.credit,
            tax: full.tax,
            tax2: full.tax2,
            total: full.total,
            balance: full.balance,
            status: full.status,
            paymentmethod: full.paymentmethod,
            notes: full.notes,
            items: full.items?.item || [],
            transactions: safeTransactions,
        };

        return NextResponse.json(safe);

    } catch (error: any) {
        console.error(
            "GET /api/whmcs/billing/invoices/[uuid] error:",
            error
        );

        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}