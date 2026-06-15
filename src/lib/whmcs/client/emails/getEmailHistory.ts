import { callWhmcsApi } from "../../index";

export async function getWhmcsEmailHistory(
    clientId: number,
    limitStart = 0,
    limitNum = 25
) {
    const data = await callWhmcsApi("GetEmails", {
        clientid: String(clientId),
        limitstart: String(limitStart),
        limitnum: String(limitNum),
    });

    if (data.result !== "success") {
        throw new Error(data.message || "Failed to fetch email history");
    }

    return {
        totalResults: data.totalresults ?? 0,
        emails: (data.emails?.email ?? []).map((e: any) => ({
            id: e.id,
            to: e.to ?? "",
            subject: e.subject ?? "",
            dateSent: e.date ?? "",
            body: e.message ?? "",
        })),
    };
}