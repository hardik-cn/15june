// src/lib/admin/getAdminFromRequest.ts
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

export async function getAdminFromRequest(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        const token = authHeader.split(" ")[1];

        const payload = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!
        ) as { userId: number };

        if (!payload || !payload.userId) {
            console.error("Invalid token payload: missing userId");
            return null;
        }

        const admin = await db.superAdmin.findUnique({
            where: { id: payload.userId }
        });

        if (!admin || !admin.status) {
            return null;
        }

        return admin;

    } catch (err: any) {
        console.error(`[AUTH_GET_ADMIN_ERROR]: ${err.message || 'Unknown error'}`);
        return null;
    }
}