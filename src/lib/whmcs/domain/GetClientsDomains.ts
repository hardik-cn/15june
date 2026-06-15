// src/lib/whmcs/domain/GetClientsDomains.ts
import { callWhmcsApi } from "../index";

export interface WhmcsDomain {
    id: string;
    domain: string;
    status: string;
    // expiryDate: string;
    nextDueDate: string;
    registrationDate: string;
    autoRenew: boolean;
    // idProtect: string;
    // recurringAmount: string;
    // firstPaymentAmount: string;
    // paymentMethod: string;
    billingCycle: string;
}

export async function getClientsDomains(clientId: string | number): Promise<{
    domains: WhmcsDomain[];
    total: number;
}> {
    // if (!clientId) {
    //     throw new Error("Client ID is required");
    // }

    const result = await callWhmcsApi("GetClientsDomains", {
        clientid: String(clientId),
        limitnum: 100, // You can make this configurable if needed
    });

    const domains = (result.domains?.domain ?? []).map((d: any): WhmcsDomain => ({
        id: d.id,
        domain: d.domainname,
        status: d.status,
        // expiryDate: d.expirydate,
        nextDueDate: d.nextduedate,
        registrationDate: d.regdate,
        autoRenew: d.donotrenew,
        // idProtect: d.idprotection,
        // recurringAmount: d.recurringamount,
        // firstPaymentAmount: d.firstpaymentamount,
        // paymentMethod: d.paymentmethod,
        billingCycle: d.regperiod,
    }));

    return {
        domains,
        total: domains.length,
    };
}