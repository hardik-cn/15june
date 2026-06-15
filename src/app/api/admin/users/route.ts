import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";

export async function PUT(request: Request) {
    try {
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, firstName, lastName, email, phone, ActiveStatus } = body;

        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            return NextResponse.json(
                { success: false, error: "Invalid User ID" },
                { status: 400 }
            );
        }

        // Fetch existing user to check country code handling
        const existingUser = await db.user.findUnique({
            where: { id: userId },
            select: { countryCode: true }
        });

        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Handle Phone Number: Strip country code if present to avoid duplication
        let finalPhone = phone;
        if (existingUser.countryCode && phone.startsWith(existingUser.countryCode)) {
            finalPhone = phone.replace(existingUser.countryCode, "").trim();
        }

        // Handle ActiveStatus mapping
        const parsedActiveStatus = ActiveStatus === "active" ? 1 : 2;

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                firstName,
                lastName,
                email,
                phone: finalPhone,
                ActiveStatus: parsedActiveStatus,
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

        return NextResponse.json({
            success: true,
            data: {
                id: `${updatedUser.id}`, // Return simply the ID as string to match GET
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                phone: `${updatedUser.countryCode} ${updatedUser.phone}`, // Reconstruct for frontend display
                ActiveStatus: updatedUser.ActiveStatus,

                createdAt: updatedUser.createdAt.toISOString(), // Standard ISO string
                updatedAt: updatedUser.updatedAt.toISOString(),
                avatar: `${updatedUser.firstName.charAt(0)}${updatedUser.lastName.charAt(0)}`.toUpperCase(),
            },
        });
    } catch (error) {
        console.error("Admin Users PUT Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update user" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // if (!(await hasPermission(admin, "users", "view"))) {
        //     return NextResponse.json({ error: "Access Denied: You do not have permission to view users." }, { status: 403 }); 
        // }

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
                id: "desc",
            },
        });

        // Transform data for frontend
        const formattedUsers = users.map((user) => ({
            id: `${user.id}`,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: `${user.countryCode} ${user.phone}`,
            // status: user.isEmailVerified ? "active" : "inactive",
            ActiveStatus: user.ActiveStatus,

            createdAt: user.createdAt.toISOString().replace("T", " ").slice(0, 16),
            updatedAt: user.updatedAt.toISOString().replace("T", " ").slice(0, 16),
            avatar: `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase(),
        }));

        return NextResponse.json({
            success: true,
            data: formattedUsers,
            total: formattedUsers.length,
        });
    } catch (error) {
        console.error("Admin Users GET Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        const userId = parseInt(id, 10);
        if (isNaN(userId)) {
            return NextResponse.json(
                { success: false, error: "Invalid User ID" },
                { status: 400 }
            );
        }

        const existingUser = await db.user.findUnique({
            where: { id: userId },
            select: { ActiveStatus: true },
        });

        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        await db.user.update({
            where: { id: userId },
            data: {
                LastStatus: existingUser.ActiveStatus,
                ActiveStatus: 3,
            },
        });

        return NextResponse.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("Admin Users DELETE Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete user" },
            { status: 500 }
        );
    }
}
export async function PATCH(request: Request) {
    try {
        const admin = await getAdminFromRequest(request);

        if (!admin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id } = body;

        const userId = parseInt(id, 10);
        if (isNaN(userId)) {
            return NextResponse.json(
                { success: false, error: "Invalid User ID" },
                { status: 400 }
            );
        }

        const existingUser = await db.user.findUnique({
            where: { id: userId },
            select: { ActiveStatus: true, LastStatus: true },
        });

        if (!existingUser) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        if (existingUser.ActiveStatus !== 3) {
            return NextResponse.json(
                { success: false, error: "User is not deleted" },
                { status: 400 }
            );
        }

        const restoreStatus = existingUser.LastStatus ?? 1;

        await db.user.update({
            where: { id: userId },
            data: {
                ActiveStatus: restoreStatus,
                LastStatus: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: "User restored successfully",
            restoredStatus: restoreStatus,
        });
    } catch (error) {
        console.error("Admin Users PATCH Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to restore user" },
            { status: 500 }
        );
    }
}