/**
 * Calls the WHMCS API with the given action and parameters.
 *
 * This helper builds a URL-encoded POST request using environment-based
 * API credentials and returns the parsed JSON response.
 *
 * @param action - The WHMCS API action to execute (e.g., "GetClients", "AddOrder")
 * @param params - Additional parameters required for the API call
 * @throws Error if the HTTP request fails
 * @returns Parsed JSON response from WHMCS API
 */
export async function callWhmcsApi(action: string, params: any = {}) {
    const body = new URLSearchParams({
        action,
        identifier: process.env.WHMCS_API_IDENTIFIER!,
        secret: process.env.WHMCS_API_SECRET!,
        responsetype: "json",
        ...params,
    });

    const res = await fetch(process.env.WHMCS_API_URL!, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    const data = await res.json();

    return data;
}