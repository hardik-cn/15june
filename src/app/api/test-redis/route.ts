import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
    await redis.set("test", "Redis working!");

    const value = await redis.get("test");

    return NextResponse.json({ value });
}