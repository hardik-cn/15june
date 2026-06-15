// src/lib/security/otpRateLimit.ts
import { redis } from "@/lib/redis";

const TEN_MIN = 600;
const ONE_DAY = 86400;

// Strict Phone Lock
export async function checkPhoneLimits(phone: string) {
    const key10Min = `otp:phone:${phone}`;
    const keyDaily = `otp:phone:daily:${phone}`;

    const count10Min = await redis.incr(key10Min);
    if (count10Min === 1) await redis.expire(key10Min, TEN_MIN);

    const countDaily = await redis.incr(keyDaily);
    if (countDaily === 1) await redis.expire(keyDaily, ONE_DAY);

    if (count10Min > 3) {
        return {
            allowed: false,
            message: "You’ve reached the maximum OTP requests. Please try again after 10 minutes."
        };
    }

    if (countDaily > 5) {
        return {
            allowed: false,
            message: "Daily OTP limit reached. Please try again tomorrow."
        };
    }

    return { allowed: true };
}

// One OTP at a time
export async function checkPendingOtp(phone: string) {
    const key = `otp:pending:${phone}`;
    const exists = await redis.get(key);

    if (exists) {
        return false;
    }

    await redis.set(key, "1", "EX", 300); // 5 min lock
    return true;
}

export async function clearPendingOtp(phone: string) {
    await redis.del(`otp:pending:${phone}`);
}