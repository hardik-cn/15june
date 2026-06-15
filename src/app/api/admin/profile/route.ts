// app/api/admin/profile/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let roleName = "SuperAdmin";
        let permissions: any = {};

        if (admin.role) {
            const roleInfo = await db.adminRole.findUnique({
                where: { id: Number(admin.role) }
            });

            if (roleInfo) {
                roleName = roleInfo.name;

                db.adminRole.findMany({
                    where: { id: Number(admin.role) }
                })

                try {
                    permissions = JSON.parse(roleInfo.permissions || "{}");
                } catch (e) {
                    permissions = {};
                }
            }
        }

        const formattedAdmin = {
            firstName: admin.first_name,
            lastName: admin.last_name,
            email: admin.email,
            phone: admin.mobile || "",
            gender: admin.gender || "",
            dateOfBirth: admin.date_of_birth ? admin.date_of_birth.toISOString().split("T")[0] : "",
            country: admin.country || "",
            state: admin.state || "",
            city: admin.city || "",
            postalCode: admin.postal_code || "",
            address: admin.address || "",
            lastLogin: admin.last_login_at ? new Date(admin.last_login_at).toLocaleString() : "Never",
            ipAddress: admin.last_login_ip || "Unknown",
            role: admin.role,
            roleName,
            permissions,
            twoFactorEnabled: admin.two_factor_enabled
        };
        // console.log(formattedAdmin);
        return NextResponse.json(formattedAdmin);

    } catch (error) {
        console.error("Profile GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const {
            firstName,
            lastName,
            email,
            phone,
            gender,
            dateOfBirth,
            country,
            state,
            city,
            postalCode,
            address
        } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                first_name: firstName,
                last_name: lastName,
                email: email,
                mobile: phone,
                gender: gender,
                date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
                country: country,
                state: state,
                city: city,
                postal_code: postalCode,
                address: address
            }
        });

        return NextResponse.json({
            success: true,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("Profile PUT Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}