// src/lib/admin/api.ts

// =============================
// ADMIN API ROUTES
// =============================
export const ADMIN_API = {

    // =============================
    // AUTHENTICATION & SESSION
    // =============================
    LOGIN: "/api/admin/login",
    LOGOUT: "/api/admin/logout",
    REFRESH: "/api/admin/refresh",
    VERIFY_2FA: "/api/admin/2fa/verify",

    // =============================
    // ADMIN PROFILE
    // =============================
    PROFILE: "/api/admin/profile",

    // =============================
    // USER MANAGEMENT
    // =============================
    USERS: {
        // Fetch all users
        LIST: "/api/admin/users",

        // Fetch single user details
        DETAILS: (id: number | string) => `/api/admin/users/${id}`,
    },

    // =============================
    // KYC MANAGEMENT
    // =============================
    KYC: {
        // Pending KYC records
        PENDING: "/api/admin/kyc/pending",

        // Approved KYC records
        APPROVED: "/api/admin/kyc/approved",

        // Rejected KYC records
        REJECTED: "/api/admin/kyc/rejected",

        // KYC Details
        DETAILS: (id: number | string) => `/api/admin/kyc/${id}`,
    },

    // =============================
    // ADMIN MANAGEMENT
    // =============================
    ADMINS: {
        // Fetch all admins
        LIST: "/api/admin/admins",
    },
};