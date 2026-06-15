// src/lib/security/emailOtpRateLimit.ts
import { redis } from "@/lib/redis";

const TEN_MIN = 600;
const ONE_DAY = 86400;

// Email Rate Limits
export async function checkEmailLimits(email: string) {
    const key10Min = `otp:email:rate:${email}`;
    const keyDaily = `otp:email:daily:${email}`;

    const count10Min = await redis.incr(key10Min);
    if (count10Min === 1) await redis.expire(key10Min, TEN_MIN);

    const countDaily = await redis.incr(keyDaily);
    if (countDaily === 1) await redis.expire(keyDaily, ONE_DAY);

    if (count10Min > 3) {
        return {
            allowed: false,
            message: "You've reached the maximum OTP requests. Try again after 10 minutes."
        };
    }

    if (countDaily > 5) {
        return {
            allowed: false,
            message: "Daily OTP limit reached. Try again tomorrow."
        };
    }

    return { allowed: true };
}

// One OTP at a time (Email)
export async function checkPendingEmailOtp(email: string) {
    const key = `otp:email:pending:${email}`;
    const exists = await redis.get(key);

    if (exists) return false;

    await redis.set(key, "1", "EX", 300); // 5 min lock
    return true;
}

export async function clearPendingEmailOtp(email: string) {
    await redis.del(`otp:email:pending:${email}`);
}