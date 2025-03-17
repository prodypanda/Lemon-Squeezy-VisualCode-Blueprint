// File: src/config.ts

import { ExtensionConfig } from './types/extensionConfig';

export const CONFIG = {
    STORE_ID: 157343,
    PRODUCT_ID: 463516,

    API_ENDPOINTS: {
        PING: 'https://api.lemonsqueezy.com/ping',
        VALIDATE: 'https://api.lemonsqueezy.com/v1/licenses/validate',
        ACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/activate',
        DEACTIVATE: 'https://api.lemonsqueezy.com/v1/licenses/deactivate'
    },

    TIMING: {
        ONLINE_PING_INTERVAL: 5000,  // 5 seconds
        OFFLINE_DURATION_LIMIT: process.env.NODE_ENV === 'production'
            ? 7 * 24 * 60 * 60 * 1000  // 7 days in production
            : 30 * 1000                 // 30 seconds in development
    },

    FEATURES: {
        FREE: ['characterCount', 'wordCount'],
        PREMIUM: ['toUpperCase', 'toLowerCase', 'base64Encode', 'base64Decode']
    },

    UI: {
        MESSAGES: {
            OFFLINE_WARNING: 'Premium features are temporarily disabled while offline',
            LICENSE_REQUIRED: 'Premium license required for this feature',
            ACTIVATION_SUCCESS: 'License activated successfully',
            DEACTIVATION_SUCCESS: 'License deactivated successfully'
        }
    },

    STORAGE_KEYS: {
        LICENSE_KEY: 'license_key',
        INSTANCE_ID: 'instance_id',
        LAST_ONLINE: 'last_online_timestamp',
        OFFLINE_START: 'offline_start_timestamp'
    }
};

export interface LicenseInfo {
    valid: boolean;
    licenseKey: string;
    instanceId: string;
    instanceName?: string;
    status: 'active' | 'inactive' | 'expired' | 'disabled';
    expiresAt?: string | null;
    activationLimit?: number;
    activationUsage?: number;
    temporarilyDisabled?: boolean;
    expired?: boolean; // NEW: Add expired property
    createdAt?: string;
    productName?: string;
    customerName?: string;
    customerEmail?: string;
}
export const DEFAULT_CONFIG: ExtensionConfig = {
    offlineDurationLimit: process.env.NODE_ENV === 'production'
        ? 7 * 24 * 60 * 60 * 1000  // 7 days
        : 30 * 1000,               // 30 seconds
    isTemporarilyDisabled: false
};