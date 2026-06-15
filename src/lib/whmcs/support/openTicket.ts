// src/lib/whmcs/support/openTicket.ts
import { callWhmcsApi } from "../index";

export interface OpenTicketParams {
    deptid: number;
    subject: string;
    message: string;
    clientid: number;
    priority?: string;
    serviceid?: number;
    markdown?: boolean;
    attachments?: string;
    customfields?: string;
}

export interface OpenTicketResponse {
    result: string;
    id: number;
    tid: string;
    c: string;
    message?: string;
}

/**
 * Opens a new support ticket in WHMCS.
 *
 * @param params - Parameters for the OpenTicket API call
 * @returns Parsed OpenTicket response from WHMCS
 */
export async function openWhmcsTicket(params: OpenTicketParams): Promise<OpenTicketResponse> {

    const apiParams: Record<string, string> = {
        deptid: String(params.deptid),
        subject: params.subject,
        message: params.message,
        clientid: String(params.clientid),
    };

    if (params.priority) apiParams.priority = params.priority;
    if (params.serviceid !== undefined) apiParams.serviceid = String(params.serviceid);
    if (params.markdown) apiParams.markdown = "true";
    if (params.customfields) apiParams.customfields = params.customfields;
    if (params.attachments && params.attachments.length > 0) (apiParams as any).attachments = params.attachments;

    const data = await callWhmcsApi("OpenTicket", apiParams);

    return data as OpenTicketResponse;
}
