// src/lib/auth/tokens.ts
import jwt from "jsonwebtoken";

export function createAccessToken(userId: number) {
    return jwt.sign(
        { userId },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "15m" }
    );
}

export function createRefreshToken(userId: number) {
    return jwt.sign(
        { userId },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: "30d" }
    );
}