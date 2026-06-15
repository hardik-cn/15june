// src/app/api/whmcs/tickets/departments/route.ts
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsSupportDepartments } from "@/lib/whmcs/support/getSupportDepartments";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const data = await getWhmcsSupportDepartments();

        if (data.result !== "success") {
            return NextResponse.json(
                { error: "Failed to fetch departments from WHMCS" },
                { status: 500 }
            );
        }

        const departments = data.departments?.department || [];

        return NextResponse.json({
            totalresults: data.totalresults,
            departments,
        });

    } catch (error: any) {
        console.error("GET /api/whmcs/tickets/departments error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
