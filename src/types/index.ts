// src/types/index.ts
export interface LicenseResponse {
    activated?: boolean;
    valid?: boolean;
    error: string | null;
    license_key: {
        id: number;
        status: 'active' | 'inactive' | 'expired' | 'disabled';
        key: string;
        activation_limit: number;
        activation_usage: number;
        created_at: string;
        expires_at: string | null;
    };
    instance?: {
        id: string;
        name: string;
        created_at: string;
    };
    meta: {
        store_id: number;
        order_id: number;
        product_id: number;
        product_name: string;
        variant_id: number;
        customer_name: string;
        customer_email: string;
    };
}

export interface WebviewMessage {
    type: string;
    value?: any;
    feature?: string;
    result?: string;
    error?: string;
    licenseInfo?: any;
}

export interface FeatureResult {
    success: boolean;
    message: string;
    data?: any;
}
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
    expired?: boolean;
    createdAt?: string;
    productName?: string;
    customerName?: string;
    customerEmail?: string;
}