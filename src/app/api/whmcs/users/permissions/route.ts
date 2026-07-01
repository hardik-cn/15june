// api/whmcs/users/permissions/route.ts
import { NextResponse } from "next/server";
import { callWhmcsApi } from "@/lib/whmcs";

export async function GET() {
    try {
        const result = await callWhmcsApi("GetPermissionsList");

        const rawPermissions =
            result.permissions?.permission || [];

        // Normalize to frontend-friendly format
        const formatted = rawPermissions.map((perm: string) => ({
            key: perm,
            label: perm.replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
        }));

        return NextResponse.json(formatted);

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}