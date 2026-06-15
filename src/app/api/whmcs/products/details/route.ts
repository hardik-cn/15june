// src/app/api/whmcs/products/details/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth/getUserFromRequest";
import { getWhmcsProductsList } from "@/lib/whmcs/services/getProducts";
import { attachUuidToServices } from "@/lib/services/serviceMapper";

export async function GET(req: Request) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const fullUser = await db.user.findUnique({
            where: { id: user.id },
            include: { onboarding: true },
        });

        const clientId = fullUser?.onboarding?.whmcsClientId;

        const services = await getWhmcsProductsList({
            clientid: String(clientId),
        });

        const servicesWithUuid = await attachUuidToServices(
            services,
            String(user.id)
        );

        return NextResponse.json({
            services: servicesWithUuid,
            total: servicesWithUuid.length,
        });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}