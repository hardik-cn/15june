// src/lib/whmcs/changePassword.ts
/*
    WHMCS GetUsers for change password
*/
export async function getWhmcsUserId(email: string): Promise<number | null> {
    try {
        const params = new URLSearchParams({
            action: "GetUsers",
            identifier: process.env.WHMCS_API_IDENTIFIER!,
            secret: process.env.WHMCS_API_SECRET!,
            search: email,
            responsetype: "json",
        });

        const res = await fetch(process.env.WHMCS_API_URL!, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
        });

        const data = await res.json();

        if (data.result !== "success" || !data.users?.length) {
            return null;
        }

        // Match exactly by email (search is a LIKE query in WHMCS)
        const user = data.users.find(
            (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        );

        return user ? Number(user.id) : null;

    } catch (err) {
        console.error("getWhmcsUserId error:", err);
        return null;
    }
}