// src/lib/security/otpGuard.ts
import { redis } from "@/lib/redis";

export async function checkPrefixAbuse(phone: string) {
    const prefix = phone.slice(0, 8);
    const key = `otp:prefix:${prefix}`;

    const count = await redis.incr(key);
    if (count === 1) {
        await redis.expire(key, 600); // 10 min
    }

    if (count > 10) {
        return false;
    }

    return true;
}