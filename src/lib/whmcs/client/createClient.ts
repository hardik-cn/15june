import { callWhmcsApi } from "../index";

// WHMCS API requires customfields encoded as PHP serialize() format, then base64.
// This function replicates PHP's serialize() for a flat string:string object.
// e.g. { "3": "27AAPFU0939F1ZV" } → a:1:{s:1:"3";s:15:"27AAPFU0939F1ZV";}
function phpSerialize(obj: Record<string, string>): string {
    const entries = Object.entries(obj);

    const inner = entries
        .map(
            ([k, v]) =>
                `s:${Buffer.byteLength(k)}:"${k}";s:${Buffer.byteLength(v)}:"${v}";`
        )
        .join("");

    return `a:${entries.length}:{${inner}}`;
}

type WhmcsClientInput = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    state?: string;
    city?: string;
    postcode?: string;
    address1?: string;
    companyName?: string;
    gstNumber?: string;
    password?: string;
    currency?: number;
    countryCode?: string;
};

export async function createWhmcsClient(data: WhmcsClientInput) {
    const params: Record<string, string> = {
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        phonenumber: data.phone,
        country: data.country,
        state: data.state ?? "",
        city: data.city ?? "",
        postcode: data.postcode ?? "",
        address1: data.address1 ?? "",
        companyname: data.companyName ?? "",
        password2: data.password ?? crypto.randomUUID(),
        currency: data.currency ? String(data.currency) : "1",
        countrycode: data.countryCode || "+91",
    };

    if (data.gstNumber) {
        const serialized = phpSerialize({
            "3": data.gstNumber,
        });

        params.customfields = Buffer.from(serialized).toString("base64");
    }

    const result = await callWhmcsApi("AddClient", params);

    if (result.result !== "success") {
        const errorMessage = result.message || "Client creation failed";
        throw new Error(errorMessage);
    }

    return Number(result.clientid);
}