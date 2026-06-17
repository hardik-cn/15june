// lib/security/getLocation.ts
export async function getLoginLocation(ip: string) {
    try {
        const token = process.env.NEXT_PUBLIC_IPINFO_TOKEN;

        const res = await fetch(
            `https://api.ipinfo.io/lite/${ip}?token=${token}`,
            {
                cache: "no-store",
            }
        );

        if (!res.ok) {
            return "India";
        }

        const data = await res.json();

        return data.country || "India";

    } catch (error) {
        console.error("IPInfo lookup failed:", error);
        return "India";
    }
}