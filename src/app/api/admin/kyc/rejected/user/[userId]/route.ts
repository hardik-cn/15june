import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { decodeId } from "@/lib/admin/encodeId";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const adminAuth = await getAdminFromRequest(request);
        if (!adminAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { userId: userIdParam } = await params;
        let numericId = Number(userIdParam);

        if (isNaN(numericId)) {
            numericId = decodeId(userIdParam);
        }

        if (isNaN(numericId)) {
            return NextResponse.json(
                { success: false, error: "Invalid userId format" },
                { status: 400 }
            );
        }

        // Fetch ALL rejection records for this userId (newest first)
        const allRejections = await db.kycRejection.findMany({
            where: { userId: numericId },
            orderBy: { verifiedAt: "desc" },
        });

        if (allRejections.length === 0) {
            return NextResponse.json({
                success: true,
                allRejections: [],
                totalRejections: 0,
            });
        }

        // Resolve rejectedBy admin names
        const adminIds = [
            ...new Set(
                allRejections
                    .map((r) => {
                        const raw = (r.rawResponse ?? {}) as Record<string, any>;
                        return raw.rejectedBy;
                    })
                    .filter((v) => v && !isNaN(Number(v)))
                    .map(Number)
            ),
        ];

        const adminMap = new Map<number, string>();
        if (adminIds.length > 0) {
            const admins = await db.superAdmin.findMany({
                where: { id: { in: adminIds } },
                select: { id: true, first_name: true, last_name: true },
            });
            for (const admin of admins) {
                adminMap.set(admin.id, `${admin.first_name} ${admin.last_name}`.trim());
            }
        }

        // Build lightweight response — no heavy didit calls for this list view
        const rejections = allRejections.map((kycRejection) => {
            const dataResponse = (kycRejection.rawResponse ?? {}) as Record<string, any>;

            const rawRejectedBy = dataResponse.rejectedBy ?? null;
            let rejectedBy: string | null = rawRejectedBy;
            if (rawRejectedBy && !isNaN(Number(rawRejectedBy))) {
                rejectedBy = adminMap.get(Number(rawRejectedBy)) ?? rawRejectedBy;
            }

            return {
                id: String(kycRejection.id),
                userId: String(numericId),
                status: kycRejection.status,
                rejectedBy,
                rejectionReason: dataResponse.rejectionReason ?? dataResponse.rejectReason ?? null,
                createdAt: dataResponse.createdAt ?? null,
                rejectedAt: dataResponse.rejectedAt ?? kycRejection.verifiedAt.toISOString(),
            };
        });

        return NextResponse.json({
            success: true,
            allRejections: rejections,
            totalRejections: rejections.length,
        });

    } catch (error) {
        console.error("Error fetching rejection history by userId:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
