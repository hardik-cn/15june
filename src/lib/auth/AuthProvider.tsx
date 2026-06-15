// src/lib/auth/AuthProvider.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { setAccessToken, clearAccessToken } from "@/lib/auth/tokenStore";

type AuthContextType = {
    isAuthenticated: boolean;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isLoading: true,
});

export function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const pathname = usePathname();

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const logout = async () => {
            try {
                await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include",
                });
            } catch (e) {
                console.error("Logout failed", e);
            } finally {
                clearAccessToken();
                setIsAuthenticated(false);
                window.location.href = "/login";
            }
        };

        const resetTimer = () => {
            clearTimeout(timeout);
            // timeout = setTimeout(logout, 30 * 1000); // 30 sec
            timeout = setTimeout(logout, 60 * 60 * 1000); // 1 hour
        };

        const events = [
            "click",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "focus"
        ];

        events.forEach(event =>
            window.addEventListener(event, resetTimer)
        );

        resetTimer();

        return () => {
            clearTimeout(timeout);
            events.forEach(event =>
                window.removeEventListener(event, resetTimer)
            );
        };
    }, []);

    useEffect(() => {
        const publicRoutes = [
            "/login",
            "/register",
            "/forgot-password",
            "/forgot-password/reset",
            "/reset-password",
            "/onboarding/digilocker/callback",
        ];

        if (publicRoutes.includes(pathname) || pathname.startsWith("/admin")) {
            setIsLoading(false);
            return;
        }

        const restoreSession = async () => {
            try {
                const res = await fetch("/api/auth/refresh", {
                    method: "POST",
                    credentials: "include",
                });

                if (res.status === 401) {
                    clearAccessToken();
                    setIsAuthenticated(false);
                    return;
                }

                if (!res.ok) {
                    throw new Error("Refresh failed");
                }

                const data = await res.json();

                setAccessToken(data.accessToken);
                setIsAuthenticated(true);

            } catch {
                clearAccessToken();
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };

        restoreSession();
    }, [pathname]);

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                isLoading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}