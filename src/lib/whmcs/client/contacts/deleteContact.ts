import { callWhmcsApi } from "../../index";

export async function deleteWhmcsContact(contactId: number) {
    const result = await callWhmcsApi("DeleteContact", {
        contactid: String(contactId),
    });

    if (result.result !== "success") {
        throw new Error(result.message || "Failed to delete contact");
    }

    return true;
}