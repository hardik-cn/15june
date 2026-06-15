// src/lib/auth/getAdminFromRequest.ts
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

export async function getAdminFromRequest(req: Request) {

    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.split(" ")[1];

    try {

        const payload = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!
        ) as { adminId: number };

        const admin = await db.superAdmin.findUnique({
            where: { id: payload.adminId }
        });

        if (!admin || !admin.status) {
            return null;
        }

        return admin;

    } catch {
        return null;
    }
}