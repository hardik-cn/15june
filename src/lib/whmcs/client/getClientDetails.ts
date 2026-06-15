import { callWhmcsApi } from "../index";

export type WhmcsClientUpdateInput = {
    clientId: number;
    emailMarketing?: boolean;
    generalEmails?: boolean;
    invoiceEmails?: boolean;
    supportEmails?: boolean;
    productEmails?: boolean;
    domainEmails?: boolean;
    affiliateEmails?: boolean;
};

/*
    WHMCS Get Client Details Function
*/
export async function getWhmcsClientDetails(clientId: number) {
    const data = await callWhmcsApi("GetClientsDetails", {
        clientid: String(clientId),
        stats: "false",
    });

    if (data.result !== "success") {
        throw new Error(data.message || "Failed to fetch client details");
    }

    return {
        id: data.client?.id ?? clientId,
        firstName: data.firstname ?? "",
        lastName: data.lastname ?? "",
        email: data.email ?? "",
        companyName: data.companyname ?? "",
        address1: data.address1 ?? "",
        address2: data.address2 ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        postcode: data.postcode ?? "",
        country: data.country ?? "",
        phone: data.phonenumber ?? "",
        currencyCode: data.currency_code ?? "",
        language: data.language ?? "Default",

        emailMarketing:
            data.marketing_emails_opt_in === true ||
            data.marketing_emails_opt_in === "true",

        emailPreferences: {
            general:
                data.email_preferences?.general === "1" ||
                data.email_preferences?.general === 1,

            invoice:
                data.email_preferences?.invoice === "1" ||
                data.email_preferences?.invoice === 1,

            support:
                data.email_preferences?.support === "1" ||
                data.email_preferences?.support === 1,

            product:
                data.email_preferences?.product === "1" ||
                data.email_preferences?.product === 1,

            domain:
                data.email_preferences?.domain === "1" ||
                data.email_preferences?.domain === 1,

            affiliate:
                data.email_preferences?.affiliate === "1" ||
                data.email_preferences?.affiliate === 1,
        },

        credit: data.credit ?? "0.00",
        customfields1: data.customfields1 || {},
        currencySymbol: data.currency_symbol ?? "",
    };
}


export async function updateWhmcsClientDetails(
    data: WhmcsClientUpdateInput
) {
    const result = await callWhmcsApi("UpdateClient", {
        clientid: String(data.clientId),

        marketingoptin: data.emailMarketing ? "true" : "false",

        "email_preferences[general]": data.generalEmails ? "1" : "0",
        "email_preferences[invoice]": data.invoiceEmails ? "1" : "0",
        "email_preferences[support]": data.supportEmails ? "1" : "0",
        "email_preferences[product]": data.productEmails ? "1" : "0",
        "email_preferences[domain]": data.domainEmails ? "1" : "0",
        "email_preferences[affiliate]": data.affiliateEmails ? "1" : "0",
    });

    console.log("📤 FINAL WHMCS PARAMS:", {
        clientid: data.clientId,
        marketingoptin: data.emailMarketing,
    });

    if (result.result !== "success") {
        throw new Error(result.message || "Failed to update client details");
    }

    return true;
}