// src/app/api/whmcs/domains/details/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { callWhmcsApi } from "@/lib/whmcs";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const domainId = searchParams.get("id");
        if (!domainId) return NextResponse.json({ error: "Domain ID required" }, { status: 400 });

        const result = await callWhmcsApi("GetClientsDomains", {
            domainid: domainId,
        });

        const d = result.domains?.domain?.[0];
        if (!d) return NextResponse.json({ error: "Domain not found" }, { status: 404 });

        // Fetch nameservers
        let nameservers: string[] = [];
        try {
            const nsResult = await callWhmcsApi("DomainGetNameservers", { domainid: domainId });
            nameservers = [
                nsResult.ns1, nsResult.ns2, nsResult.ns3, nsResult.ns4, nsResult.ns5,
            ].filter(Boolean);
        } catch {}

        // Fetch locking status
        let registrarLock = false;
        try {
            const lockResult = await callWhmcsApi("DomainGetLockingStatus", { domainid: domainId });
            registrarLock = lockResult.lockstatus === "locked";
        } catch {}

        // Fetch WHOIS info
        let whoisInfo: any = {};
        try {
            const whoisResult = await callWhmcsApi("DomainGetWhoisInfo", { domainid: domainId });
            whoisInfo = whoisResult;
        } catch {}

        return NextResponse.json({
            domain: {
                id: d.id,
                domain: d.domainname,
                status: d.status,
                expiryDate: d.expirydate,
                nextDueDate: d.nextduedate,
                registrationDate: d.registrationdate,
                autoRenew: d.autorenew === "1" || d.autorenew === 1,
                idProtect: d.idprotect === "1" || d.idprotect === 1,
                registrar: d.registrar,
                recurringAmount: d.recurringamount,
                firstPaymentAmount: d.firstpaymentamount,
                paymentMethod: d.paymentmethod,
                billingCycle: d.billingcycle,
                nameservers,
                registrarLock,
                whoisInfo,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
