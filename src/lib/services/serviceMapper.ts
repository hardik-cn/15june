// lib/services/serviceMapper.ts
import { db } from "@/lib/db";

export async function attachUuidToServices(
    services: any[],
    userId: string
) {
    if (!services.length) return [];

    // Get all existing mappings at once
    const existingMappings = await db.serviceMapping.findMany({
        where: {
            userId,
            serviceId: {
                in: services.map((s) => s.id),
            },
        },
    });

    const map = new Map(
        existingMappings.map((m) => [m.serviceId, m.id])
    );

    const toCreate: { serviceId: string; userId: string }[] = [];

    for (const s of services) {
        if (!map.has(s.id)) {
            toCreate.push({
                serviceId: s.id,
                userId,
            });
        }
    }

    // Bulk insert missing mappings (FAST)
    if (toCreate.length > 0) {
        await db.serviceMapping.createMany({
            data: toCreate,
            skipDuplicates: true,
        });

        // Re-fetch new mappings
        const newMappings = await db.serviceMapping.findMany({
            where: {
                userId,
                serviceId: {
                    in: toCreate.map((t) => t.serviceId),
                },
            },
        });

        newMappings.forEach((m) => {
            map.set(m.serviceId, m.id);
        });
    }

    // Attach UUID to services
    return services.map((s) => ({
        ...s,
        uuid: map.get(s.id),
    }));
}