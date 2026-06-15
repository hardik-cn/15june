/**
 * Admin API Endpoint Definitions
 * Use these constants with adminFetch for consistent routing.
 */
export const ADMIN_API = {
    // Auth & Session
    LOGIN: "/api/admin/login",
    LOGOUT: "/api/admin/logout",
    REFRESH: "/api/admin/refresh",
    VERIFY_2FA: "/api/admin/2fa/verify",

    // Profile
    PROFILE: "/api/admin/profile",

    // User Management
    USERS: {
        LIST: "/api/admin/users", // Assuming standard paths
        DETAILS: (id: number | string) => `/api/admin/users/${id}`,
    },

    // KYC Management
    KYC: {
        PENDING: "/api/admin/kyc/pending",
        APPROVED: "/api/admin/kyc/approved",
        REJECTED: "/api/admin/kyc/rejected",
        DETAILS: (id: number | string) => `/api/admin/kyc/${id}`,
    },

    // Admin Management
    ADMINS: {
        LIST: "/api/admin/admins",
    }
};
