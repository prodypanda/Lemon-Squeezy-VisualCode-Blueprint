// src/config.ts

export const CONFIG = {
    STORE_ID: 157343, // Replace with your store ID
    PRODUCT_ID: 463516, // Replace with your product ID

    API_ENDPOINTS: {
        PING: 'https://api.lemonsqueezy.com/ping',
        VALIDATE: 'https://api.lemonsqueezy.com/v1/licenses/validate',
        ACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/activate',
        DEACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/deactivate',
    },

    TIMING: {
        ONLINE_PING_INTERVAL: 5000, // 5 seconds
        OFFLINE_DURATION_LIMIT: process.env.NODE_ENV === 'production'
            ? 7 * 24 * 60 * 60 * 1000  // 7 days in production
            : 30 * 1000                 // 30 seconds in development
    },

    FEATURES: {
        FREE: ['characterCount', 'wordCount'],
        PREMIUM: ['toUpperCase', 'toLowerCase', 'base64Encode', 'base64Decode'],
    },

    UI: {
        MESSAGES: {
            OFFLINE_WARNING: 'Premium features are temporarily disabled while offline',
            LICENSE_REQUIRED: 'Premium license required for this feature',
            ACTIVATION_SUCCESS: 'License activated successfully',
            DEACTIVATION_SUCCESS: 'License deactivated successfully',
        },
    },

    STORAGE_KEYS: {
        LICENSE_KEY: 'license_key',
        INSTANCE_ID: 'instance_id',
        LAST_ONLINE: 'last_online_timestamp', // Keep track of last successful online check
        OFFLINE_START: 'offline_start_timestamp',
        STORED_LICENSE_INFO: 'stored_license_info', // Key for storing the entire LicenseInfo
    },
};