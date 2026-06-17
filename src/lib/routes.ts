// src/lib/routes.ts

// =============================
// ADMIN ROOT PATH
// =============================
export const ADMIN_ROOT = "/admin";

// =============================
// ADMIN ROUTE DEFINITIONS
// =============================
export const ADMIN_ROUTES = {
    // =============================
    // DASHBOARD
    // =============================
    DASHBOARD: `${ADMIN_ROOT}/dashboard`,
    // DASHBOARD: ADMIN_ROOT,

    // =============================
    // AUTHENTICATION
    // =============================
    LOGIN: `${ADMIN_ROOT}/login`,

    // =============================
    // KYC MANAGEMENT
    // =============================
    KYC: {
        PENDING: `${ADMIN_ROOT}/kyc/pending`,
        APPROVED: `${ADMIN_ROOT}/kyc/approved`,
        REJECTED: `${ADMIN_ROOT}/kyc/rejected`,
    },

    // =============================
    // USER MANAGEMENT
    // =============================
    USERS: {
        LIST: `${ADMIN_ROOT}/users/list`,
        CREATE: `${ADMIN_ROOT}/users/create`,
        DELETED: `${ADMIN_ROOT}/users/deleted`,
    },

    // =============================
    // STAFF MANAGEMENT
    // =============================
    STAFF: {
        LIST: `${ADMIN_ROOT}/staff/list`,
        CREATE: `${ADMIN_ROOT}/staff/create`,
        UPDATE: `${ADMIN_ROOT}/staff/update`,
        DELETED: `${ADMIN_ROOT}/staff/deleted`,
    },

    // =============================
    // ROLE MANAGEMENT
    // =============================
    ROLES: `${ADMIN_ROOT}/roles`,

    // =============================
    // EMAIL TEMPLATE MANAGEMENT
    // =============================
    EMAIL_TEMPLATES: {
        LIST: `${ADMIN_ROOT}/email-templates/list`,
        CREATE: `${ADMIN_ROOT}/email-templates/create`,
    },

    // =============================
    // ADMIN PROFILE
    // =============================
    PROFILE: `${ADMIN_ROOT}/profile`,

    // =============================
    // ACTIVITY LOGS
    // =============================
    ACTIVITY_LOG: `${ADMIN_ROOT}/activity-log`,

    // =============================
    // MESSAGES
    // =============================
    MESSAGES: `${ADMIN_ROOT}/messages`,

    // =============================
    // SETTINGS
    // =============================
    SETTINGS: `${ADMIN_ROOT}/settings`,
};