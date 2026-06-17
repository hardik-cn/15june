// src/app/api/admin/document/route.ts

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

// Base directory where private business documents are stored
const PRIVATE_DIR = path.join(process.cwd(), "private");

export async function GET(request: NextRequest) {
    try {
        let admin = null;

        // =============================
        // STEP 1: AUTHENTICATE ADMIN
        // =============================
        try {
            const authHeader = request.headers.get("authorization");

            if (authHeader && authHeader.startsWith("Bearer ")) {
                const token = authHeader.split(" ")[1];

                const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { userId: number };

                if (payload?.userId) {
                    admin = await db.superAdmin.findUnique({
                        where: { id: payload.userId }
                    });
                }
            }

        } catch {
            // Ignore invalid authorization token
        }

        // =============================
        // STEP 2: AUTHENTICATE USING QUERY TOKEN
        // =============================
        if (!admin) {
            try {
                const { searchParams } = new URL(request.url);
                const token = searchParams.get("token");

                if (token) {
                    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { userId: number };

                    if (payload?.userId) {
                        admin = await db.superAdmin.findUnique({
                            where: { id: payload.userId }
                        });
                    }
                }

            } catch {
                // Ignore invalid query token
            }
        }

        if (!admin || !admin.status) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // =============================
        // STEP 3: VALIDATE REQUEST PARAMETERS
        // =============================
        const { searchParams } = new URL(request.url);
        const filePath = searchParams.get("path");
        const forceDownload = searchParams.get("download") === "1";

        if (!filePath) {
            return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
        }

        // =============================
        // STEP 4: VALIDATE FILE PATH
        // =============================
        const resolvedPath = path.resolve(PRIVATE_DIR, filePath);

        if (!resolvedPath.startsWith(PRIVATE_DIR)) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        if (!fs.existsSync(resolvedPath)) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // =============================
        // STEP 5: LOAD FILE CONTENT
        // =============================
        const fileBuffer = fs.readFileSync(resolvedPath);
        const ext = path.extname(resolvedPath).toLowerCase();

        const mimeTypes: Record<string, string> = {
            ".pdf": "application/pdf",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
        };

        const contentType = mimeTypes[ext] || "application/octet-stream";
        const fileName = path.basename(resolvedPath);

        // =============================
        // STEP 6: RETURN FILE RESPONSE
        // =============================
        return new NextResponse(fileBuffer,
            {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Content-Disposition": forceDownload ? `attachment; filename="${fileName}"` : contentType === "application/pdf" ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`,
                    "Cache-Control": "private, no-cache",
                },
            }
        );

    } catch (error) {
        console.error("Error serving document:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}