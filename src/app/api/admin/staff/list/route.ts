import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // const { searchParams } = new URL(req.url);
        // const statusParam = searchParams.get("status");
        // const statusFilter = statusParam != null && statusParam !== "" ? Number(statusParam) : null;
        const url = new URL(req.url);
        const type = url.searchParams.get("type");

        const where =
            type === "deleted"
                ? { status: 3 }
                : { status: { in: [1, 0] } };

        const admins = await db.superAdmin.findMany({
            orderBy: {
                id: 'desc'
            },
            where,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile: true,
                role: true,
                status: true,
                last_login_ip: true,
                last_login_at: true,
                two_factor_enabled: true,
                created_at: true,
                updated_at: true,
            },
            // where: {
            //     status: { notIn: [3] }
            // }
        });
        // console.log("Admins list data from API (/api/admin/staff/list):", admins);
        // debugger;

        return NextResponse.json({
            success: true, admins: admins.map(admin => ({
                ...admin,
                last_login_at: admin.last_login_at?.toISOString().replace("T", " ").slice(0, 19),
                created_at: admin.created_at?.toISOString().replace("T", " ").slice(0, 19),
                updated_at: admin.updated_at?.toISOString().replace("T", " ").slice(0, 19)
            }))
        });

    } catch (error) {
        console.error("Admin List API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
