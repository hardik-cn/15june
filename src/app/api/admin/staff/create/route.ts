
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";

export async function POST(req: Request) {
    try {
        const adminAuth = await getAdminFromRequest(req);
        if (!adminAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { firstName, lastName, email, phoneNumber, role, status, password, twoFactorEnabled, twoFactorSecret } = body;

        // Basic validation
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if exists
        const existing = await db.superAdmin.findFirst({
            where: {
                OR: [
                    { email: email },
                    { mobile: phoneNumber }
                ]
            }
        });

        if (existing?.email === email) {
            return NextResponse.json({ error: "Admin with this email already exists" }, { status: 400 });
        }

        if (existing?.mobile === phoneNumber) {
            return NextResponse.json({ error: "Admin with this phone number already exists" }, { status: 400 });
        }

        // console.log("Existing Admin:", existing);
        // debugger;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create Admin
        // Note: two_factor_enabled defaults to false, user can enable it later
        const newAdmin = await db.superAdmin.create({
            data: {
                first_name: firstName,
                last_name: lastName,
                email,
                mobile: phoneNumber,
                password: hashedPassword,
                role: role,
                status: status,
                two_factor_enabled: false, // Forced to false during creation to trigger setup flow if secret exists
                two_factor_secret: twoFactorEnabled === true ? twoFactorSecret : null,
            } as any,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile: true,
                role: true,
                status: true,
                created_at: true
            }
        });

        // console.log("New Admin:", newAdmin);
        // debugger;

        // role related name get data
        const roleData = await db.adminRole.findUnique({
            where: {
                id: Number(role)
            },
            select: {
                name: true
            }
        });

        // console.log("New Admin:", newAdmin);
        // debugger;

        const rawData = {
            newData: {
                name: `${firstName || ""} ${lastName || ""}`.trim(),
                email: email,
                role: roleData?.name,
                status: status === "active" ? "active" : "inactive",
                phone: phoneNumber,
                twoFactorEnabled: twoFactorEnabled,
            },
            oldData: null
        };

        const deviceInfo = parseDeviceInfo(req.headers.get("user-agent") || "unknown");

        await logAdminActivity({
            logAction: "STAFF_CREATED",
            logMessage: "Created staff successfully",
            userId: newAdmin.id,
            // username: `${updatedAdmin.first_name} ${updatedAdmin.last_name}`,
            adminId: adminAuth.id,
            adminName: `${adminAuth.first_name || ""} ${adminAuth.last_name || ""}`.trim() || null,
            ipAddress:
                req.headers.get("x-forwarded-for") ||
                req.headers.get("x-real-ip") ||
                "unknown",
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            rawData,
            userAgent: req.headers.get("user-agent") || "unknown",
        });

        return NextResponse.json({ success: true, admin: newAdmin });

    } catch (error) {
        console.error("Create Admin Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const adminAuth = await getAdminFromRequest(req);
        if (!adminAuth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        return NextResponse.json({ message: "Admin create endpoint is active" });
    } catch (error) {
        console.error("Admin Create GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}