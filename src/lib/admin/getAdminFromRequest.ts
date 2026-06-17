// src/lib/admin/getAdminFromRequest.ts

import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

export async function getAdminFromRequest(req: Request) {
    try {
        // =============================
        // STEP 1: EXTRACT AUTHORIZATION HEADER
        // =============================
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        // =============================
        // STEP 2: EXTRACT ACCESS TOKEN
        // =============================
        const token = authHeader.split(" ")[1];

        // =============================
        // STEP 3: VERIFY JWT TOKEN
        // =============================
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
            userId: number;
        };

        // =============================
        // STEP 4: VALIDATE TOKEN PAYLOAD
        // =============================
        if (!payload || !payload.userId) {
            console.error("Invalid token payload: missing userId");
            return null;
        }

        // =============================
        // STEP 5: FETCH ADMIN RECORD
        // =============================
        const admin = await db.superAdmin.findUnique({
            where: { id: payload.userId },
        });

        // =============================
        // STEP 6: VALIDATE ADMIN STATUS
        // =============================
        if (!admin || !admin.status) {
            return null;
        }

        // =============================
        // STEP 7: RETURN AUTHENTICATED ADMIN
        // =============================
        return admin;

    } catch (err: any) {
        console.error(`[AUTH_GET_ADMIN_ERROR]: ${err.message || "Unknown error"}`);
        return null;
    }
}