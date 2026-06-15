import { callWhmcsApi } from "../index";

export async function createSsoToken(clientId: number | string, goto?: string) {
    const params: any = {
        client_id: clientId,
    };

    if (goto) {
        params.goto = goto;
    }

    return await callWhmcsApi("CreateSsoToken", params);
}