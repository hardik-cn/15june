// src/lib/security/emailOtpGuard.ts
import { redis } from "@/lib/redis";

export async function checkEmailAbuse(email: string) {
    const domain = email.split("@")[1];
    const key = `otp:email:domain:${domain}`;

    const count = await redis.incr(key);

    if (count === 1) {
        await redis.expire(key, 600);
    }

    if (count > 10) {
        return false;
    }

    return true;
}