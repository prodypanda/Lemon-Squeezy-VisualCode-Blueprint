export interface ExtensionConfig {
    licenseKey?: string;
    instanceId?: string;
    lastOnlineTimestamp?: number;
    offlineStartTimestamp?: number;
    offlineDurationLimit: number;
    isTemporarilyDisabled: boolean;
}

export interface OnlineCheckResult {
    isOnline: boolean;
    timestamp: number;
}
