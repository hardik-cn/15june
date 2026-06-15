// src/lib/whmcs/updateContact.ts
/*
    WHMCS Update Contact Function
*/

function getCountryFromDialCode(code: string): string {
    const map: Record<string, string> = {
        "+91": "IN",
        "+1": "US",
        "+44": "GB",
        "+61": "AU",
        "+971": "AE",
    };

    return map[code] || "IN";
}

export async function updateWhmcsClientPhone(
    clientId: number,
    phone: string,
    countryCode: string
) {
    try {
        const country = getCountryFromDialCode(countryCode);

        const params = new URLSearchParams({
            action: "UpdateClient",
            clientid: String(clientId),
            phonenumber: phone,
            country: country,
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
        console.error("WHMCS ERROR:", error.message);
        throw error;
    }
}