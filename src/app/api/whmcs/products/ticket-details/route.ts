// src/app/api/whmcs/products/ticket-details/route.ts

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsProductsDetails } from "@/lib/whmcs/services/getProducts";
import { z } from "zod";

const ticketDetailsSchema = z.object({
    serviceid: z.string().min(1, "serviceid is required"),
});

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
        const serviceidParam = searchParams.get("serviceid");

        const parsed = ticketDetailsSchema.safeParse({ serviceid: serviceidParam });
        if (!parsed.success) {
            return NextResponse.json(
                { error: "serviceid is required" },
                { status: 400 }
            );
        }

        const { serviceid } = parsed.data;

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