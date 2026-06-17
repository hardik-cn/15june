// src/app/api/admin/kyc/rejected/user/[userId]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { decodeId } from "@/lib/admin/encodeId";

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(request);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: VALIDATE USER ID
        // =============================
        const { userId: userIdParam } = await params;

        let numericId = Number(userIdParam);

        if (isNaN(numericId)) {
            numericId = decodeId(userIdParam);
        }

        if (isNaN(numericId)) {
            return NextResponse.json({ success: false, error: "Invalid userId format" }, { status: 400 });
        }

        // =============================
        // STEP 3: FETCH REJECTION HISTORY
        // =============================
        const allRejections =
            await db.kycRejection.findMany({
                where: { userId: numericId },
                orderBy: {
                    verifiedAt: "desc",
                },
            });

        if (allRejections.length === 0) {
            return NextResponse.json({ success: true, allRejections: [], totalRejections: 0 }, { status: 200 });
        }

        // =============================
        // STEP 4: LOAD ADMIN DETAILS
        // =============================
        const adminIds = [
            ...new Set(
                allRejections.map((r) => {
                    const raw = (r.rawResponse ?? {}) as Record<string, any>;
                    return raw.rejectedBy;
                }).filter((v) => v && !isNaN(Number(v))).map(Number)
            ),
        ];

        const adminMap = new Map<number, string>();

        if (adminIds.length > 0) {
            const admins = await db.superAdmin.findMany({
                where: { id: { in: adminIds } },
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                },
            });

            for (const admin of admins) {
                adminMap.set(admin.id, `${admin.first_name} ${admin.last_name}`.trim());
            }
        }

        // =============================
        // STEP 5: FORMAT REJECTION DATA
        // =============================
        const rejections =
            allRejections.map(
                (kycRejection) => {
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
                }
            );

        // =============================
        // STEP 6: RETURN REJECTION HISTORY
        // =============================
        return NextResponse.json({
            success: true,
            allRejections: rejections,
            totalRejections: rejections.length
        });

    } catch (error) {
        console.error("Error fetching rejection history by userId:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}