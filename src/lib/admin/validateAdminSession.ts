// src/lib/admin/validateAdminSession.ts

import { jwtVerify } from "jose";

// =============================
// INITIALIZE JWT SECRET
// =============================
const secret = new TextEncoder().encode(
    process.env.REFRESH_TOKEN_SECRET
);

// =============================
// VALIDATE ADMIN TOKEN
// =============================
export async function validateAdminToken(token: string) {
    try {
        // =============================
        // STEP 1: VERIFY JWT TOKEN
        // =============================
        const { payload } = await jwtVerify(token, secret);

        // =============================
        // STEP 2: RETURN TOKEN PAYLOAD
        // =============================
        return payload;

    } catch (error) {
        return null;
    }
}