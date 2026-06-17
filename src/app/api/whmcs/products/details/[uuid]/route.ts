// src/app/api/whmcs/products/details/[uuid]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsProductsDetails } from "@/lib/whmcs/services/getProducts";
import { getServiceIdFromUuid } from "@/lib/services/getServiceByUuid";
import { z } from "zod";

const productDetailsUuidSchema = z.object({
    uuid: z.string().uuid("Invalid UUID format"),
});

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ uuid: string }> }
) {
    try {
        const { uuid } = await context.params;

        const parsed = productDetailsUuidSchema.safeParse({ uuid });
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
        }

        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const serviceId = await getServiceIdFromUuid(uuid, String(user.id));

        const fullUser = await db.user.findUnique({
            where: { id: user.id },
            include: { onboarding: true },
        });

        const clientId = fullUser?.onboarding?.whmcsClientId;

        if (!clientId) {
            return NextResponse.json(
                { error: "No WHMCS client ID found" },
                { status: 400 }
            );
        }

        const services = await getWhmcsProductsDetails({
            serviceid: serviceId,
        });

        const service = services?.[0];

        if (!service) {
            return NextResponse.json(
                { error: "Service not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { service },
            { headers: { "Cache-Control": "no-store" } }
        );

    } catch (error: any) {
        console.error("PRODUCT DETAIL API ERROR:", error);

        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}