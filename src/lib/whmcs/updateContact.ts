// src/lib/whmcs/updateContact.ts
/*
    WHMCS Update Contact Function
*/

export async function updateWhmcsClientPhone(
    clientId: number,
    phone: string,
    countryCode: string // IN, US, AE, etc.
) {
    try {
        const params = new URLSearchParams({
            action: "UpdateClient",
            clientid: String(clientId),
            phonenumber: phone,
            country: countryCode,
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            responsetype: "json",
        });

        const res = await fetch(process.env.WHMCS_API_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
        });

        const data = await res.json();

        if (data.result !== "success") {
            throw new Error(data.message || "WHMCS update failed");
        }

        return data;
    } catch (error: any) {
        throw error;
    }
}

export async function updateWhmcsClientEmail(
    clientId: number,
    email: string
) {
    try {
        const params = new URLSearchParams({
            action: "UpdateClient",
            clientid: String(clientId),
            email: email,
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            responsetype: "json",
        });

        const res = await fetch(process.env.WHMCS_API_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });

        const data = await res.json();

        if (data.result !== "success") {
            throw new Error(data.message || "WHMCS update failed");
        }

        return data;

    } catch (error: any) {
        throw error;
    }
}

export async function updateWhmcsUserEmail(
    userId: number,
    email: string
) {
    try {
        const params = new URLSearchParams({
            action: "UpdateUser",
            user_id: String(userId),
            email,
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            responsetype: "json",
        });

        const res = await fetch(process.env.WHMCS_API_URL!, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params,
        });

        const data = await res.json();

        if (data.result !== "success") {
            throw new Error(data.message || "WHMCS user update failed");
        }

        return data;
    } catch (error: any) {
        throw error;
    }

}
