// src/lib/whmcs/support/getSupportDepartments.ts
import { callWhmcsApi } from "../index";

export interface WhmcsDepartment {
    id: string;
    name: string;
    awaitingreply: string;
    opentickets: string;
}

export interface GetSupportDepartmentsResponse {
    result: string;
    totalresults: number;
    departments: {
        department: WhmcsDepartment[];
    };
}

/**
 * Fetches support departments from WHMCS.
 *
 * @returns Parsed GetSupportDepartments response from WHMCS
 */
export async function getWhmcsSupportDepartments(): Promise<GetSupportDepartmentsResponse> {
    const data = await callWhmcsApi("GetSupportDepartments", {
        ignore_dept_assignments: "true",
    });

    return data as GetSupportDepartmentsResponse;
}
