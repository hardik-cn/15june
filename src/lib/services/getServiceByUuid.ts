import { db } from "@/lib/db";

export async function getServiceIdFromUuid(uuid: string, userId: string) {
    const mapping = await db.serviceMapping.findFirst({
        where: {
            id: uuid,
            userId,
        },
    });

    if (!mapping) {
        throw new Error("Service not found");
    }

    return mapping.serviceId;
}