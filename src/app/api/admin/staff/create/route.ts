// src/app/api/admin/staff/create/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getAdminFromRequest } from "@/lib/admin/getAdminFromRequest";
import { logAdminActivity } from "@/lib/admin/logAdminActivity";
import { parseDeviceInfo } from "@/lib/admin/device";
import { getISTDateWithOffset } from "@/lib/getISTDate";

export async function POST(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
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
            phoneNumber,
            role,
            status,
            password,
            twoFactorEnabled,
            twoFactorSecret,
        } = body;

        // =============================
        // STEP 3: VALIDATE REQUIRED FIELDS
        // =============================
        if (!firstName || !lastName || !email || !phoneNumber || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // =============================
        // STEP 4: CHECK FOR DUPLICATE ADMIN
        // =============================
        const existing = await db.superAdmin.findFirst({
            where: { OR: [{ email }, { mobile: phoneNumber }] },
        });

        if (existing?.email === email) {
            return NextResponse.json({ error: "Admin with this email already exists" }, { status: 400 });
        }

        if (existing?.mobile === phoneNumber) {
            return NextResponse.json({ error: "Admin with this phone number already exists" }, { status: 400 });
        }

        // =============================
        // STEP 5: HASH PASSWORD
        // =============================
        const hashedPassword = await bcrypt.hash(password, 10);

        // =============================
        // STEP 6: CREATE ADMIN ACCOUNT
        // =============================
        const newAdmin = await db.superAdmin.create({
            data: {
                first_name: firstName,
                last_name: lastName,
                email,
                mobile: phoneNumber,
                password: hashedPassword,
                role,
                status,
                two_factor_enabled: twoFactorEnabled === true,
                two_factor_secret: twoFactorEnabled === true ? twoFactorSecret : null,
                two_factor_configured: false,
                created_at: getISTDateWithOffset(0),
                updated_at: getISTDateWithOffset(0),
            } as any,
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                mobile: true,
                role: true,
                status: true,
                created_at: true,
            },
        });

        // =============================
        // STEP 7: FETCH ROLE DETAILS
        // =============================
        const roleData = await db.adminRole.findUnique({
            where: { id: Number(role) },
            select: {
                name: true
            },
        });

        // =============================
        // STEP 8: PREPARE ACTIVITY LOG DATA
        // =============================
        const rawData = {
            newData: {
                name: `${firstName || ""} ${lastName || ""}`.trim(),
                email,
                role: roleData?.name,
                status: status === "active" ? "active" : "inactive",
                phone: phoneNumber,
                twoFactorEnabled,
            },
            oldData: null,
        };

        // =============================
        // STEP 9: COLLECT DEVICE INFORMATION
        // =============================
        const deviceInfo = parseDeviceInfo(req.headers.get("user-agent") || "unknown");

        // =============================
        // STEP 10: LOG STAFF CREATION ACTIVITY
        // =============================
        await logAdminActivity({
            logAction: "STAFF_CREATED",
            logMessage: "Created staff successfully",
            userId: newAdmin.id,
            adminId: adminAuth.id,
            adminName: `${adminAuth.first_name || ""} ${adminAuth.last_name || ""}`.trim() || null,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            rawData,
            userAgent: req.headers.get("user-agent") || "unknown",
        });

        // =============================
        // STEP 11: RETURN CREATED ADMIN
        // =============================
        return NextResponse.json({
            success: true,
            admin: newAdmin,
        });

    } catch (error) {
        console.error("ADMIN_CREATE_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        const adminAuth = await getAdminFromRequest(req);

        if (!adminAuth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 2: RETURN ENDPOINT STATUS
        // =============================
        return NextResponse.json({ message: "Admin create endpoint is active" });

    } catch (error) {
        console.error("ADMIN_CREATE_GET_ERROR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}