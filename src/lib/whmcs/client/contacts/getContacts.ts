import { callWhmcsApi } from "../../index";

export async function getWhmcsContacts(clientId: number) {
    const data = await callWhmcsApi("GetContacts", {
        clientid: String(clientId),
    });

    if (data.result !== "success") {
        throw new Error(data.message || "Failed to fetch contacts");
    }

    function toBool(val: any): boolean {
        return val == 1 || val === true || val === "on";
    }

    const contacts = data.contacts?.contact ?? [];

    const filteredContacts = contacts.filter(
        (c: any) => Number(c.userid) === Number(clientId)
    );

    return filteredContacts.map((c: any) => ({
        id: c.id,
        userId: c.userid,
        firstName: c.firstname ?? "",
        lastName: c.lastname ?? "",
        email: c.email ?? "",
        companyName: c.companyname ?? "",
        address1: c.address1 ?? "",
        address2: c.address2 ?? "",
        city: c.city ?? "",
        state: c.state ?? "",
        postcode: c.postcode ?? "",
        country: c.country ?? "",
        phone: c.phonenumber ?? "",
        emailPreferences: {
            general: toBool(c.generalemails),
            invoice: toBool(c.invoiceemails),
            support: toBool(c.supportemails),
            product: toBool(c.productemails),
            domain: toBool(c.domainemails),
            affiliate: toBool(c.affiliateemails),
        },
    }));
}