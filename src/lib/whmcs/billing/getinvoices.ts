// lib/whmcs/getinvoices.ts
import { callWhmcsApi } from "../index";

export type WhmcsInvoiceStatus =
    | "Paid"
    | "Unpaid"
    | "Cancelled"
    | "Refunded"
    | "Collections"
    | "Draft";

export interface WhmcsInvoice {
    id: string;
    invoicenum?: string;
    userid?: string;
    date: string;
    duedate: string;
    datepaid?: string;
    total: string;
    status: WhmcsInvoiceStatus | string;
    paymentmethod?: string;
}

export interface GetInvoicesResponse {
    result: "success" | "error" | string;
    totalresults: number;
    startnumber?: number;
    numreturned?: number;
    invoices?: {
        invoice?: WhmcsInvoice[];
    };
}

export interface WhmcsInvoiceItem {
    id: number | string;
    type: string;
    relid: number | string;
    description: string;
    amount: string;
    taxed: number | string;
}

export interface GetInvoiceResponse {
    result: "success" | "error" | string;
    invoiceid: number | string;
    invoicenum?: string;
    userid?: number | string;
    date: string;
    duedate: string;
    datepaid?: string;
    lastcaptureattempt?: string;
    subtotal?: string;
    credit?: string;
    tax?: string;
    tax2?: string;
    total: string;
    balance?: string;
    taxrate?: string;
    taxrate2?: string;
    status: WhmcsInvoiceStatus | string;
    paymentmethod?: string;
    notes?: string;
    ccgateway?: boolean;
    items?: {
        item?: WhmcsInvoiceItem[];
    };
    transactions?: {
        transaction?: WhmcsTransaction[];
    };
}

export interface WhmcsTransaction {
    id: string;
    userid?: string;
    invoiceid?: string;
    date?: string;
    gateway?: string;
    description?: string;
    amountin?: string;
    fees?: string;
    amountout?: string;
    transid?: string;
    refundid?: string;
}

export interface GetTransactionsResponse {
    result: "success" | "error" | string;
    totalresults: number;
    startnumber?: number;
    numreturned?: number;
    transactions?: {
        transaction?: WhmcsTransaction[];
    };
}

/**
 * Fetches invoices from WHMCS.
 *
 * @returns Parsed GetInvoices response from WHMCS
 */
export async function getWhmcsInvoices(opts?: {
    userid?: string | number;
    orderby?: "invoicenumber" | "id" | "date" | "duedate" | "status" | "total";
    order?: "ASC" | "DESC";
}): Promise<GetInvoicesResponse> {
    const params: Record<string, string> = {};

    if (opts?.userid !== undefined && opts?.userid !== null) {
        params.userid = String(opts.userid);
    }

    if (opts?.orderby) {
        params.orderby = opts.orderby;
    }

    if (opts?.order) {
        params.order = opts.order;
    }

    const data = await callWhmcsApi("GetInvoices", params);

    return data as GetInvoicesResponse;
}

export async function getWhmcsInvoice(invoiceId: string | number): Promise<GetInvoiceResponse> {
    const data = await callWhmcsApi("GetInvoice", {
        invoiceid: String(invoiceId),
    });

    return data as GetInvoiceResponse;
}

export async function getWhmcsTransactions(params: {
    clientid: string | number;
    invoiceid?: string | number;
}): Promise<WhmcsTransaction[]> {
    try {
        const res = await callWhmcsApi("GetTransactions", {
            clientid: String(params.clientid),
            ...(params.invoiceid && {
                invoiceid: String(params.invoiceid),
            }),
        });

        let transactions: WhmcsTransaction[] =
            res.result === "success"
                ? res.transactions?.transaction || []
                : [];

        if (
            transactions.length === 0 &&
            params.invoiceid !== undefined
        ) {
            const fallback = await callWhmcsApi("GetTransactions", {
                clientid: String(params.clientid),
            });

            const all: WhmcsTransaction[] =
                fallback.result === "success"
                    ? fallback.transactions?.transaction || []
                    : [];

            transactions = all.filter(
                (t) =>
                    t.invoiceid !== undefined && t.invoiceid !== null && t.invoiceid !== ""
                        ? String(t.invoiceid) === String(params.invoiceid)
                        : false // skip transactions with no invoiceid in fallback
            );

            // If still empty, try matching by amount+date heuristic OR just return all for this client
            if (transactions.length === 0) {
                transactions = all; // last resort: show all client transactions
            }
        }

        return transactions;
    } catch (error) {
        console.error("WHMCS getTransactions error:", error);
        return [];
    }
}