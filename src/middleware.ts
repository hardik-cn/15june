import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateAdminToken } from "@/lib/admin/validateAdminSession";

export async function middleware(req: NextRequest) {

    const { pathname } = req.nextUrl;

    const refreshToken = req.cookies.get("refresh_token");

    const isAuthenticated = !!refreshToken;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    const csrfExcluded = [
        "/api/csrf",
        "/api/auth/login",
        "/api/auth/register",
        "/api/otp/phone",
        "/api/otp/email",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/refresh",
        "/api/auth/logout",
        "/api/admin/2fa/verify",
        "/api/admin/login",
        "/api/admin/logout",
        "/api/admin/refresh",
    ];

    const isExcluded = csrfExcluded.some(path =>
        pathname.startsWith(path)
    );

    const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];

    if (
        pathname.startsWith("/api") &&
        mutatingMethods.includes(req.method) &&
        !isExcluded
    ) {
        const cookieToken = req.cookies.get("csrf_token")?.value;

        const headerToken = req.headers.get("x-csrf-token");

        if (!cookieToken || !headerToken || cookieToken !== headerToken) {
            return NextResponse.json(
                {
                    error: "Invalid CSRF token",
                },
                {
                    status: 403,
                }
            );
        }
    }

    // =============================
    // GLOBAL RATE LIMIT
    // =============================
    try {
        const rateRes = await fetch(
            `${req.nextUrl.origin}/api/security/rate-limit`,
            {
                method: "POST",
                headers: {
                    "x-forwarded-for": ip
                }
            }
        );

        if (rateRes.status === 429) {
            return new NextResponse(
                JSON.stringify({
                    error: "Too many requests"
                }),
                { status: 429 }
            );
        }
    } catch {
        // fail open (don’t block if API fails)
    }

    // =============================
    // ROOT ROUTE
    // =============================

    if (pathname === "/") {

        if (isAuthenticated) {
            return NextResponse.redirect(
                new URL("/dashboard", req.url)
            );
        }

        return NextResponse.redirect(
            new URL("/login", req.url)
        );
    }

    // =============================
    // BLOCK LOGIN PAGE IF LOGGED IN
    // =============================

    if (pathname === "/login" && isAuthenticated) {
        return NextResponse.redirect(
            new URL("/dashboard", req.url)
        );
    }

    // =============================
    // PUBLIC ROUTES (NO AUTH)
    // =============================

    const publicPaths = [
        "/onboarding/digilocker/callback",
        "/auth/reset-password",
        "/auth/forgot-password",
        "/auth/login",
        "/auth/register",
        "/auth/verify-email",
    ];

    const isPublic = publicPaths.some(path =>
        pathname.startsWith(path)
    );

    if (isPublic) {
        return NextResponse.next();
    }

    // =============================
    // USER PROTECTED ROUTES
    // =============================

    const protectedPaths = [
        "/dashboard",
        "/account",
        "/billing",
        "/change-password",
        "/orders",
        "/onboarding",
        "/user-management",
        "/domains",
        "/services",
        "/support",
        "/profile",
        "/security-settings",
        "/active-sessions"
    ];

    const isProtected = protectedPaths.some(path =>
        pathname.startsWith(path)
    );

    if (isProtected) {

        // =============================
        // NOT LOGGED IN
        // =============================

        if (!isAuthenticated) {
            return NextResponse.redirect(
                new URL("/login", req.url)
            );
        }

    }

    // =============================
    // ADMIN ROUTES
    // =============================

    if (pathname.startsWith("/admin")) {

        const adminToken = req.cookies.get("admin_refresh_token")?.value;

        const validAdminSession = adminToken ? await validateAdminToken(adminToken) : null;

        if (pathname === "/admin") {
            return NextResponse.redirect(
                new URL(validAdminSession ? "/admin/dashboard" : "/admin/login", req.url)
            );
        }

        if (pathname === "/admin/login") {
            if (validAdminSession) {
                return NextResponse.redirect(
                    new URL("/admin/dashboard", req.url)
                );
            }

            return NextResponse.next();
        }

        if (!validAdminSession) {
            return NextResponse.redirect(
                new URL("/admin/login", req.url)
            );
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/api/:path*",
        "/",
        "/login",
        "/admin",
        "/admin/:path*",
        "/dashboard/:path*",
        "/account/:path*",
        "/billing/:path*",
        "/orders/:path*",
        "/onboarding/:path*",
        "/user-management/:path*",
        "/domains/:path*",
        "/services/:path*",
        "/support/:path*",
        "/profile/:path*",
        "/security-settings/:path*",
        "/active-sessions/:path*"
    ],
};