// src/lib/whmcs/support/getTickets.ts
import { callWhmcsApi } from "../index";

export interface WhmcsTicket {
    id: string;
    tid: string;
    deptid: string;
    userid: string;
    name: string;
    owner_name: string;
    email: string;
    requestor_name: string;
    requestor_email: string;
    requestor_type: string;
    cc: string;
    c: string;
    date: string;
    subject: string;
    status: string;
    priority: string;
    admin: string;
    attachment: string;
    attachments: { filename: string; index: number }[];
    attachments_removed: boolean;
    lastreply: string;
    flag: string;
    service: string;
}

export interface GetTicketsResponse {
    result: string;
    totalresults: number;
    startnumber: number;
    numreturned: number;
    tickets: {
        ticket: WhmcsTicket[];
    };
}

export interface GetTicketsParams {
    clientid: number;
    status?: string;
    limitstart?: number;
    limitnum?: number;
    deptid?: number;
    subject?: string;
    ignore_dept_assignments?: boolean;
}

/**
 * Fetches support tickets from WHMCS for a given client.
 *
 * @param params - Parameters for the GetTickets API call
 * @returns Parsed GetTickets response from WHMCS
 */
export async function getWhmcsTickets(params: GetTicketsParams): Promise<GetTicketsResponse> {
    const apiParams: Record<string, string> = {
        clientid: String(params.clientid),
    };

    if (params.status) apiParams.status = params.status;
    if (params.limitstart !== undefined) apiParams.limitstart = String(params.limitstart);
    if (params.limitnum !== undefined) apiParams.limitnum = String(params.limitnum);
    if (params.deptid !== undefined) apiParams.deptid = String(params.deptid);
    if (params.subject) apiParams.subject = params.subject;
    if (params.ignore_dept_assignments) apiParams.ignore_dept_assignments = "true";

    const data = await callWhmcsApi("GetTickets", apiParams);

    return data as GetTicketsResponse;
}
