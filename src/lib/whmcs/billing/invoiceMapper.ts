// src/lib/whmcs/billing/invoiceMapper.ts
import { db } from "@/lib/db";

export async function attachUuidToInvoices(
    invoices: any[],
    userId: string
) {
    return Promise.all(
        invoices.map(async (invoice) => {
            const invoiceId = String(invoice.id);

            let mapping = await db.invoiceMapping.findUnique({
                where: {
                    invoiceId_userId: {
                        invoiceId,
                        userId,
                    },
                },
            });

            if (!mapping) {
                mapping = await db.invoiceMapping.create({
                    data: {
                        invoiceId,
                        userId,
                    },
                });
            }

            return {
                ...invoice,
                uuid: mapping.id,
            };
        })
    );
}

export async function getInvoiceIdFromUuid(
    uuid: string,
    userId: string
) {
    const mapping = await db.invoiceMapping.findFirst({
        where: {
            id: uuid,
            userId,
        },
    });

    if (!mapping) {
        throw new Error("Invoice not found");
    }

    return mapping.invoiceId;
}