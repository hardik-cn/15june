// src/app/api/admin/profile/routes.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function GET(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: FETCH ROLE INFORMATION
        // =============================
        let roleName = "SuperAdmin";
        let permissions: any = {};

        if (admin.role) {
            const roleInfo = await db.adminRole.findUnique({
                where: { id: Number(admin.role) }
            });

            if (roleInfo) {
                roleName = roleInfo.name;

                try {
                    permissions = JSON.parse(roleInfo.permissions || "{}");
                } catch {
                    permissions = {};
                }
            }
        }

        // =============================
        // STEP 3: FORMAT PROFILE DATA
        // =============================
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
            twoFactorEnabled: admin.two_factor_enabled,
        };

        // =============================
        // STEP 4: RETURN PROFILE DATA
        // =============================
        return NextResponse.json(formattedAdmin);

    } catch (error) {
        console.error("Profile GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(req);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PARSE REQUEST DATA
        // =============================
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
            address,
        } = body;

        // =============================
        // STEP 3: VALIDATE INPUT DATA
        // =============================
        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // =============================
        // STEP 4: UPDATE ADMIN PROFILE
        // =============================
        await db.superAdmin.update({
            where: { id: admin.id },
            data: {
                first_name: firstName,
                last_name: lastName,
                email,
                mobile: phone,
                gender,
                date_of_birth: dateOfBirth ? new Date(dateOfBirth) : null,
                country,
                state,
                city,
                postal_code: postalCode,
                address,
            },
        });

        // =============================
        // STEP 5: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "Profile updated successfully"
        });

    } catch (error) {
        console.error("Profile PUT Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}