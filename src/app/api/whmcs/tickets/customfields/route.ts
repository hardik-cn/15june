// src/app/api/whmcs/tickets/customfields/route.ts

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const departmentId = searchParams.get("department_id");

        if (!departmentId) {
            return NextResponse.json(
                { error: "Department ID required" },
                { status: 400 }
            );
        }

        // Call WHMCS addon API
        const res = await fetch(
            `${process.env.WHMCS_URL}/modules/addons/customfields_api/api.php?department_id=${departmentId}`,
            {
                headers: {
                    "X-API-KEY": process.env.WHMCS_CUSTOM_SECRET_KEY!,
                },
                cache: "no-store",
            }
        );

        const data = await res.json();

        if (!res.ok || data.error) {
            return NextResponse.json(
                { error: data.error || "Failed to fetch custom fields" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            fields: data.data || [],
        });

    } catch (error: any) {
        console.error("Custom Fields API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}