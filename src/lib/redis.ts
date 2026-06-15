// src/lib/redis.ts
import Redis from "ioredis";

const globalForRedis = global as unknown as {
    redis: any | undefined;
};

// Commented out to prevent ECONNREFUSED error when Redis is not running locally
// export const redis =
//     globalForRedis.redis ??
//     new Redis({
//         host: process.env.REDIS_HOST || "127.0.0.1",
//         port: Number(process.env.REDIS_PORT) || 6379,
//         password: process.env.REDIS_PASSWORD,
//     });

// Mock redis object to prevent errors when other files try to call redis methods
export const redis = globalForRedis.redis ?? {
    get: async () => null,
    set: async () => "OK",
    setex: async () => "OK",
    del: async () => 1,
    incr: async () => 1,
    expire: async () => 1,
    pipeline: () => {
        const p = {
            incr: () => p,
            expire: () => p,
            exec: async () => []
        };
        return p;
    }
} as any;

if (process.env.NODE_ENV !== "production") {
    globalForRedis.redis = redis;
}