import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
    process.env.REFRESH_TOKEN_SECRET
);

export async function validateAdminToken(token: string) {
    try {
        const { payload } = await jwtVerify(
            token,
            secret
        );

        return payload;
    } catch {
        return null;
    }
}