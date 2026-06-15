// src/lib/auth/getUserFromRequest.ts
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

export async function getUserFromRequest(req: Request) {

    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.split(" ")[1];

    try {

        const payload = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET!
        ) as { userId: number };

        const user = await db.user.findUnique({
            where: { id: payload.userId }
        });

        return user;

    } catch {
        return null;
    }
}