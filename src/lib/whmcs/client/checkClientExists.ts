import { callWhmcsApi } from "../index";

/*
    WHMCS Check Client Exists Function
*/
export async function checkWhmcsClientExists(email: string) {
    const data = await callWhmcsApi("GetUsers", {
        search: email,
    });

    if (data.result !== "success" || !data.users?.length) {
        return null;
    }

    const user = data.users.find(
        (u: any) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) return null;

    return {
        userid: Number(user.id),
        clientid: Number(user.clients?.[0]?.id),
        email: user.email,
    };
}