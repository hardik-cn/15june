import { redis } from "@/lib/redis";

const LIMIT = 5;
const DEVICE_LIMIT = 10;
const GLOBAL_LIMIT = 100;

const BLOCK_TIME = 60; // 1 minutes

export async function checkLoginRateLimit(
    ip: string,
    email: string,
    deviceFingerprint: string
) {

    const ipKey = `login:ip:${ip}`;
    const emailKey = `login:email:${email}`;
    const comboKey = `login:combo:${ip}:${email}`;
    const deviceKey = `login:device:${deviceFingerprint}`;
    const globalKey = `login:global`;

    const [
        ipAttempts,
        emailAttempts,
        comboAttempts,
        deviceAttempts,
        globalAttempts
    ] = await Promise.all([
        redis.get(ipKey),
        redis.get(emailKey),
        redis.get(comboKey),
        redis.get(deviceKey),
        redis.get(globalKey)
    ]);

    if (
        Number(ipAttempts) >= LIMIT ||
        Number(emailAttempts) >= LIMIT ||
        Number(comboAttempts) >= LIMIT ||
        Number(deviceAttempts) >= DEVICE_LIMIT ||
        Number(globalAttempts) >= GLOBAL_LIMIT
    ) {
        return false;
    }

    return true;
}

export async function recordFailedLogin(
    ip: string,
    email: string,
    deviceFingerprint: string
) {

    const ipKey = `login:ip:${ip}`;
    const emailKey = `login:email:${email}`;
    const comboKey = `login:combo:${ip}:${email}`;
    const deviceKey = `login:device:${deviceFingerprint}`;
    const globalKey = `login:global`;

    const pipeline = redis.pipeline();

    pipeline.incr(ipKey);
    pipeline.incr(emailKey);
    pipeline.incr(comboKey);
    pipeline.incr(deviceKey);
    pipeline.incr(globalKey);

    pipeline.expire(ipKey, BLOCK_TIME);
    pipeline.expire(emailKey, BLOCK_TIME);
    pipeline.expire(comboKey, BLOCK_TIME);
    pipeline.expire(deviceKey, BLOCK_TIME);
    pipeline.expire(globalKey, 60); // global resets every minute

    await pipeline.exec();
}

export async function clearLoginAttempts(
    ip: string,
    email: string,
    deviceFingerprint: string
) {

    const ipKey = `login:ip:${ip}`;
    const emailKey = `login:email:${email}`;
    const comboKey = `login:combo:${ip}:${email}`;
    const deviceKey = `login:device:${deviceFingerprint}`;

    await redis.del(ipKey, emailKey, comboKey, deviceKey);
}