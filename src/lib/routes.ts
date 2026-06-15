export const ADMIN_ROOT = "/admin";

export const ADMIN_ROUTES = {
    DASHBOARD: `${ADMIN_ROOT}/dashboard`,
    // DASHBOARD: ADMIN_ROOT,

    LOGIN: `${ADMIN_ROOT}/login`,
    KYC: {
        PENDING: `${ADMIN_ROOT}/kyc/pending`,
        APPROVED: `${ADMIN_ROOT}/kyc/approved`,
        REJECTED: `${ADMIN_ROOT}/kyc/rejected`,
    },
    USERS: {
        LIST: `${ADMIN_ROOT}/users/list`,
        CREATE: `${ADMIN_ROOT}/users/create`,
        DELETED: `${ADMIN_ROOT}/users/deleted`,
    },
    STAFF: {
        LIST: `${ADMIN_ROOT}/staff/list`,
        CREATE: `${ADMIN_ROOT}/staff/create`,
        UPDATE: `${ADMIN_ROOT}/staff/update`,
        DELETED: `${ADMIN_ROOT}/staff/deleted`,
    },
    ROLES: `${ADMIN_ROOT}/roles`,
    EMAIL_TEMPLATES: {
        LIST: `${ADMIN_ROOT}/email-templates/list`,
        CREATE: `${ADMIN_ROOT}/email-templates/create`,
    },
    PROFILE: `${ADMIN_ROOT}/profile`,
    ACTIVITY_LOG: `${ADMIN_ROOT}/activity-log`,


    MESSAGES: `${ADMIN_ROOT}/messages`,
    SETTINGS: `${ADMIN_ROOT}/settings`,
};