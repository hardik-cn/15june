import { callWhmcsApi } from "../../index";

/*
    WHMCS Add Contact Function
*/
export type WhmcsContactInput = {
    clientId: number;
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    phone?: string;
    generalEmails?: boolean;
    invoiceEmails?: boolean;
    supportEmails?: boolean;
    productEmails?: boolean;
    domainEmails?: boolean;
    affiliateEmails?: boolean;
};

export async function addWhmcsContact(data: WhmcsContactInput) {
    const result = await callWhmcsApi("AddContact", {
        clientid: String(data.clientId),

        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,

        companyname: data.companyName ?? "",
        address1: data.address1 ?? "",
        address2: data.address2 ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        postcode: data.postcode ?? "",
        country: data.country ?? "",
        phonenumber: data.phone ?? "",

        "email_preferences[general]": data.generalEmails ? "true" : "false",
        "email_preferences[invoice]": data.invoiceEmails ? "true" : "false",
        "email_preferences[support]": data.supportEmails ? "true" : "false",
        "email_preferences[product]": data.productEmails ? "true" : "false",
        "email_preferences[domain]": data.domainEmails ? "true" : "false",
        "email_preferences[affiliate]": data.affiliateEmails ? "true" : "false",
    });

    if (result.result !== "success") {
        throw new Error(result.message || "Failed to add contact");
    }

    return { contactId: Number(result.contactid) };
}