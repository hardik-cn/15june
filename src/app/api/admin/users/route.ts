// src/app/api/admin/users/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function PUT(request: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PARSE REQUEST DATA
        // =============================
        const body = await request.json();

        const {
            id,
            firstName,
            lastName,
            email,
            phone,
            ActiveStatus,
        } = body;

        // =============================
        // STEP 3: VALIDATE USER ID
        // =============================
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return NextResponse.json({ success: false, error: "Invalid User ID" }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH EXISTING USER
        // =============================
        const existingUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                countryCode: true,
            },
        });

        if (!existingUser) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: FORMAT PHONE NUMBER
        // =============================
        let finalPhone = phone;

        if (existingUser.countryCode && phone.startsWith(existingUser.countryCode)) {
            finalPhone = phone.replace(existingUser.countryCode, "").trim();
        }

        // =============================
        // STEP 6: MAP ACTIVE STATUS
        // =============================
        const parsedActiveStatus = ActiveStatus === "active" ? 1 : 2;

        // =============================
        // STEP 7: UPDATE USER RECORD
        // =============================
        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                firstName,
                lastName,
                email,
                phone: finalPhone,
                ActiveStatus: parsedActiveStatus,
                updatedAt: getISTDateWithOffset(0),
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                countryCode: true,
                isEmailVerified: true,
                ActiveStatus: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // =============================
        // STEP 8: RETURN UPDATED USER
        // =============================
        return NextResponse.json({
            success: true,
            data: {
                id: `${updatedUser.id}`,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: `${updatedUser.countryCode} ${updatedUser.phone}`,
                ActiveStatus: updatedUser.ActiveStatus,
                createdAt: updatedUser.createdAt.toISOString(),
                updatedAt: updatedUser.updatedAt.toISOString(),
                avatar: `${updatedUser.firstName.charAt(0)}${updatedUser.lastName.charAt(0)}`.toUpperCase(),
            },
        });

    } catch (error) {
        console.error("Admin Users PUT Error:", error);
        return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: FETCH USERS
        // =============================
        const users = await db.user.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                countryCode: true,
                isEmailVerified: true,
                ActiveStatus: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                id: "desc"
            }
        });

        // =============================
        // STEP 3: FORMAT USER DATA
        // =============================
        const formattedUsers = users.map((user) => ({
            id: `${user.id}`,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: `${user.countryCode} ${user.phone}`,
            // status: user.isEmailVerified ? "active" : "inactive",
            ActiveStatus: user.ActiveStatus,
            createdAt: user.createdAt.toISOString().replace("T", " ").slice(0, 19),
            updatedAt: user.updatedAt.toISOString().replace("T", " ").slice(0, 19),
            avatar: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
        }));

        // =============================
        // STEP 4: RETURN USERS
        // =============================
        return NextResponse.json({
            success: true,
            data: formattedUsers,
            total: formattedUsers.length,
        });

    } catch (error) {
        console.error("Admin Users GET Error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PARSE REQUEST DATA
        // =============================
        const body = await request.json();
        const { id } = body;

        // =============================
        // STEP 3: VALIDATE USER ID
        // =============================
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return NextResponse.json({ success: false, error: "Invalid User ID" }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH EXISTING USER
        // =============================
        const existingUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                ActiveStatus: true,
            },
        });

        if (!existingUser) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: SOFT DELETE USER
        // =============================
        await db.user.update({
            where: { id: userId },
            data: {
                LastStatus: existingUser.ActiveStatus,
                ActiveStatus: 3,
                updatedAt: getISTDateWithOffset(0),
            },
        });

        // =============================
        // STEP 6: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "User deleted successfully",
        });

    } catch (error) {
        console.error("Admin Users DELETE Error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: PARSE REQUEST DATA
        // =============================
        const body = await request.json();
        const { id } = body;

        // =============================
        // STEP 3: VALIDATE USER ID
        // =============================
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return NextResponse.json({ success: false, error: "Invalid User ID" }, { status: 400 });
        }

        // =============================
        // STEP 4: FETCH EXISTING USER
        // =============================
        const existingUser = await db.user.findUnique({
            where: { id: userId },
            select: {
                ActiveStatus: true,
                LastStatus: true,
            },
        });

        if (!existingUser) {
            return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: VERIFY USER IS DELETED
        // =============================
        if (existingUser.ActiveStatus !== 3) {
            return NextResponse.json({ success: false, error: "User is not deleted" }, { status: 400 });
        }

        // =============================
        // STEP 6: DETERMINE RESTORE STATUS
        // =============================
        const restoreStatus = existingUser.LastStatus ?? 1;

        // =============================
        // STEP 7: RESTORE USER ACCOUNT
        // =============================
        await db.user.update({
            where: { id: userId },
            data: {
                ActiveStatus: restoreStatus,
                LastStatus: null,
                updatedAt: getISTDateWithOffset(0),
            },
        });

        // =============================
        // STEP 8: RETURN SUCCESS RESPONSE
        // =============================
        return NextResponse.json({
            success: true,
            message: "User restored successfully",
            restoredStatus: restoreStatus,
        });

    } catch (error) {
        console.error("Admin Users PATCH Error:", error);
        return NextResponse.json({ success: false, error: "Failed to restore user" }, { status: 500 });
    }
}