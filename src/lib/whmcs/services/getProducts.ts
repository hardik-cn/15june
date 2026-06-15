// src/lib/whmcs/getProducts.ts
import { callWhmcsApi } from "../index";

function normalizeArray(data: any) {
    if (!data) return [];

    return Array.isArray(data) ? data : [data];
}

export async function getWhmcsProductsList(params?: {
    clientid?: string;
}) {
    try {
        const response = await callWhmcsApi("GetClientsProducts", {
            ...(params?.clientid && { clientid: params.clientid }),
            limitnum: 1000,
        });

        if (response.result !== "success") {
            throw new Error(response.message || "Failed to fetch services");
        }

        const rawProducts = response?.products?.product ? Array.isArray(response.products.product) ? response.products.product : [response.products.product] : [];

        return rawProducts.map((p: any) => ({
            id: String(p.id),

            name: p.name,
            domain: p.domain || null,

            status: p.status,
            billingCycle: p.billingcycle,

            recurringAmount: parseFloat(p.recurringamount) || 0,
            nextDueDate: p.nextduedate,
        }));

    } catch (error: any) {
        console.error("getWhmcsProductsLite ERROR:", error);
        throw error;
    }
}

export async function getWhmcsProductsDetails(params?: {
    clientid?: string;
    serviceid?: string;
    pid?: string;
    domain?: string;
}) {
    try {
        const response = await callWhmcsApi("GetClientsProducts", {
            ...(params?.clientid && { clientid: params.clientid }),
            ...(params?.serviceid && { serviceid: params.serviceid }),
            ...(params?.pid && { pid: params.pid }),
            ...(params?.domain && { domain: params.domain }),
            limitnum: 1000,
        });

        if (response.result !== "success") {
            throw new Error(response.message || "Failed to fetch services");
        }

        const rawProducts = response?.products?.product ? Array.isArray(response.products.product) ? response.products.product : [response.products.product] : [];

        return rawProducts.map((p: any) => ({
            id: String(p.id),

            serviceId: p.id,
            clientId: p.clientid,

            orderId: p.orderid,
            orderNumber: p.ordernumber,

            productId: p.pid,

            name: p.name,
            groupName: p.groupname,

            domain: p.domain,

            dedicatedIp: p.dedicatedip,
            assignedIps: p.assignedips,

            serverId: p.serverid,
            serverName: p.servername,
            serverHost: p.serverhostname,
            serverIp: p.serverip,

            username: p.username,

            billingCycle: p.billingcycle,

            firstPayment: p.firstpaymentamount,
            recurringAmount: p.recurringamount,

            paymentMethod: p.paymentmethod,
            paymentMethodName: p.paymentmethodname,

            status: p.status,

            nextDueDate: p.nextduedate,
            regDate: p.regdate,

            diskUsage: p.diskusage,
            diskLimit: p.disklimit,

            bwUsage: p.bwusage,
            bwLimit: p.bwlimit,

            notes: p.notes,

            ns1: p.ns1,
            ns2: p.ns2,

            customFields: normalizeArray(
                p.customfields?.customfield
            ).map((item: any) => ({
                id: item.id,
                name: item.name,
                value: item.value,
            })),

            configOptions: normalizeArray(
                p.configoptions?.configoption
            ).map((item: any) => ({
                id: item.id,
                optionname: item.option,
                optionvalue: item.value,
                type: item.type,
            })),

            raw: p,
        }));

    } catch (error: any) {
        console.error("getWhmcsProducts ERROR:", error);
        throw error;
    }
}