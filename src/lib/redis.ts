// src/lib/redis.ts
import Redis from "ioredis";

const globalForRedis = global as unknown as {
    redis: any | undefined;
};

// Commented out to prevent ECONNREFUSED error when Redis is not running locally
export const redis =
    globalForRedis.redis ??
    new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
    });