import { callWhmcsApi } from "../../index";

/*
    WHMCS Update Contact Function
*/
export type WhmcsContactUpdateInput = {
    contactId: number;
    firstName?: string;
    lastName?: string;
    email?: string;
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

export async function updateWhmcsContact(data: WhmcsContactUpdateInput) {
    const result = await callWhmcsApi("UpdateContact", {
        contactid: String(data.contactId),

        ...(data.firstName !== undefined && { firstname: data.firstName }),
        ...(data.lastName !== undefined && { lastname: data.lastName }),
        ...(data.email !== undefined && { email: data.email }),

        ...(data.companyName !== undefined && { companyname: data.companyName }),
        ...(data.address1 !== undefined && { address1: data.address1 }),
        ...(data.address2 !== undefined && { address2: data.address2 }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.postcode !== undefined && { postcode: data.postcode }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.phone !== undefined && { phonenumber: data.phone }),

        "email_preferences[general]": data.generalEmails ? "1" : "0",
        "email_preferences[invoice]": data.invoiceEmails ? "1" : "0",
        "email_preferences[support]": data.supportEmails ? "1" : "0",
        "email_preferences[product]": data.productEmails ? "1" : "0",
        "email_preferences[domain]": data.domainEmails ? "1" : "0",
        "email_preferences[affiliate]": data.affiliateEmails ? "1" : "0",
    });

    if (result.result !== "success") {
        throw new Error(result.message || "Failed to update contact");
    }

    return true;
}