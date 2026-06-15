// src/app/api/whmcs/products/ticket-details/route.ts

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsProductsDetails } from "@/lib/whmcs/services/getProducts";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);

        const serviceid = searchParams.get("serviceid");

        if (!serviceid) {
            return NextResponse.json(
                { error: "serviceid is required" },
                { status: 400 }
            );
        }

        const services = await getWhmcsProductsDetails({
            clientid: String(user.whmcsClientId),
            serviceid,
        });

        return NextResponse.json({
            services,
        });

    } catch (error: any) {
        console.error("Ticket details route error:", error);

        return NextResponse.json(
            {
                error: error.message || "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }
}