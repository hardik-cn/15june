import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";

        const key = `global:rate:${ip}`;

        const count = await redis.incr(key);

        if (count === 1) {
            await redis.expire(key, 60); // 1 min window
        }

        if (count > 100) {
            return NextResponse.json(
                { allowed: false },
                { status: 429 }
            );
        }

        return NextResponse.json({ allowed: true });

    } catch (err) {
        return NextResponse.json({ allowed: true }); // fail open
    }
}