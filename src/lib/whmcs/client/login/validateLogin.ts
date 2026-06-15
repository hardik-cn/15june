import { callWhmcsApi } from "../../index";

export async function validateWhmcsLogin(
    email: string,
    password: string
) {
    try {
        // ===============================
        // STEP 1: Validate Login
        // ===============================
        const loginData = await callWhmcsApi("ValidateLogin", {
            email,
            password2: password,
        });

        if (loginData.result !== "success") {
            return null;
        }

        // ===============================
        // STEP 2: Get User
        // ===============================
        const userData = await callWhmcsApi("GetUsers", {
            user_id: String(loginData.userid),
        });

        if (userData.result !== "success" || !userData.users?.length) {
            return null;
        }

        const user = userData.users.find(
            (u: any) => String(u.id) === String(loginData.userid)
        );

        if (!user) return null;

        const clientId = user.clients?.[0]?.id;

        if (!clientId) return null;

        // ===============================
        // STEP 3: Get Client Details
        // ===============================
        const clientData = await callWhmcsApi("GetClientsDetails", {
            clientid: String(clientId),
            stats: "false",
        });

        if (clientData.result !== "success") {
            return null;
        }

        return {
            clientId: Number(clientId),
            email: clientData.email,
            firstName: clientData.firstname,
            lastName: clientData.lastname,
            phone: clientData.phonenumber || "",
            countryCode: clientData.country || "",
        };

    } catch (error) {
        console.error("WHMCS login error:", error);
        return null;
    }
}