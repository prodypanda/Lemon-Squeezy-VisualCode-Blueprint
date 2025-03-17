// src/services/licenseService.ts
import * as vscode from 'vscode';
import { CONFIG } from '../config';
import { NetworkMonitor } from '../utils/networkMonitor';
import { ApiService } from './apiService';
import { LicenseResponse, LicenseInfo } from '../types'; // Import from ../types

export class LicenseService {
    private isPremiumTemporarilyDisabled: boolean = false;
    private isExpired: boolean = false;
    private notificationShown: boolean = false;
    private networkMonitor: NetworkMonitor;
    private onlineStatusListeners: ((isOnline: boolean, licenseInfo?: LicenseInfo | null) => void)[] = [];
    private checkInterval!: NodeJS.Timer;

    constructor(private context: vscode.ExtensionContext) {
        this.isPremiumTemporarilyDisabled = context.globalState.get('isPremiumTemporarilyDisabled', false);
        this.isExpired = context.globalState.get('isExpired', false);
        this.notificationShown = context.globalState.get('expirationNotificationShown', false);
        this.networkMonitor = new NetworkMonitor();

        this.networkMonitor.on('statusChange', (isOnline: boolean) => {
            this.handleNetworkStatusChange(isOnline);
        });
    }

    public initialize(): void {
        this.startOnlineChecking();
        this.checkInitialStatus();  // Check status immediately on startup
    }

    public onOnlineStatusChange(listener: (isOnline: boolean, licenseInfo?: LicenseInfo | null) => void) {
        this.onlineStatusListeners.push(listener);
    }

    private startOnlineChecking(): void {
        this.checkInterval = setInterval(async () => {
            const isOnline = await this.networkMonitor.getStatus();
            this.handleNetworkStatusChange(isOnline);
        }, CONFIG.TIMING.ONLINE_PING_INTERVAL);
    }


    private async checkInitialStatus(): Promise<void> {
        const isOnline = await this.networkMonitor.getStatus();
        this.handleNetworkStatusChange(isOnline, true); // Force initial update
    }


    private async handleNetworkStatusChange(isOnline: boolean, initialCheck: boolean = false): Promise<void> {
        const licenseInfo = await this.getCurrentLicenseInfo();
        if (isOnline) {
            await this.context.globalState.update(CONFIG.STORAGE_KEYS.LAST_ONLINE, Date.now());
            if (!initialCheck) {
                await this.validateCurrentLicense();
            }

        } else {
            // Offline
            const lastOnline = this.context.globalState.get<number>(CONFIG.STORAGE_KEYS.LAST_ONLINE, Date.now());
            const offlineDuration = Date.now() - lastOnline;

            if (offlineDuration > CONFIG.TIMING.OFFLINE_DURATION_LIMIT) {
                await this.temporarilyDisablePremiumFeatures();
            }
        }
        this.onlineStatusListeners.forEach(listener => listener(isOnline, licenseInfo));

    }

    private async temporarilyDisablePremiumFeatures(): Promise<void> {
        if (!this.isPremiumTemporarilyDisabled) {
            this.isPremiumTemporarilyDisabled = true;
            await this.context.globalState.update('isPremiumTemporarilyDisabled', true);
            vscode.window.showWarningMessage('Premium features temporarily disabled due to offline duration limit.');
            const licenseInfo = await this.getCurrentLicenseInfo(); // Get current info
            this.onlineStatusListeners.forEach(listener => listener(false, licenseInfo));
        }
    }
    private async getCurrentLicenseInfo(): Promise<LicenseInfo | null> {
        const storedLicenseInfo = this.context.globalState.get<LicenseInfo>(CONFIG.STORAGE_KEYS.STORED_LICENSE_INFO);

        if (!storedLicenseInfo) {
            return null; // No license info stored
        }
        return {
            ...storedLicenseInfo, // Use the stored info
            valid: !this.isPremiumTemporarilyDisabled && !this.isExpired,
            status: this.isPremiumTemporarilyDisabled ? 'inactive' : (this.isExpired ? 'expired' : 'active'),
            temporarilyDisabled: this.isPremiumTemporarilyDisabled,
            expired: this.isExpired,
        };
    }

    public async activateLicense(licenseKey: string): Promise<LicenseInfo> {
        const instanceName = `VSCode-${Date.now()}`;
        let response: LicenseResponse; // Declare the type
        try {
            response = await ApiService.activateLicense(licenseKey, instanceName);
        } catch (error) {
            throw error; // Re-throw for UI handling in sidebarProvider
        }


        if (response.activated && response.instance?.id) {
            if (response.meta.store_id !== CONFIG.STORE_ID || response.meta.product_id !== CONFIG.PRODUCT_ID) {
                throw new Error("This license key is not valid for this product.");
            }

            const licenseInfo = this.formatLicenseInfo(response);
            await this.storeLicenseInfo(licenseInfo); // Store complete LicenseInfo
            return licenseInfo;
        }
        throw new Error(response.error || 'Activation failed: Missing instance data');
    }


    private async validateCurrentLicense(): Promise<void> {
        const storedLicenseInfo = this.context.globalState.get<LicenseInfo>(CONFIG.STORAGE_KEYS.STORED_LICENSE_INFO);
        if (!storedLicenseInfo) return;

        const { licenseKey, instanceId } = storedLicenseInfo;

        try {
            const response = await ApiService.validateLicense(licenseKey, instanceId);

            if (response.valid) {
                // --- Handle VALID License ---
                const updatedLicenseInfo: LicenseInfo = {
                    ...this.formatLicenseInfo(response),  // Use formatLicenseInfo for consistency
                    temporarilyDisabled: this.isPremiumTemporarilyDisabled, // Keep the temporary disabled state
                    expired: response.license_key.status === 'expired',
                };

                await this.context.globalState.update(CONFIG.STORAGE_KEYS.STORED_LICENSE_INFO, updatedLicenseInfo);

                if (this.isPremiumTemporarilyDisabled) {
                    this.isPremiumTemporarilyDisabled = false;
                    await this.context.globalState.update('isPremiumTemporarilyDisabled', false);
                    vscode.window.showInformationMessage('Premium features have been re-enabled.');
                }
                // Reset expiration flags if the license is now valid
                if (this.isExpired) {
                    this.isExpired = false;
                    await this.context.globalState.update('isExpired', false);
                    this.notificationShown = false;
                    await this.context.globalState.update('expirationNotificationShown', false);
                }
                this.onlineStatusListeners.forEach(listener => listener(true, updatedLicenseInfo));


            } else if (response.error === 'license_key not found.') {
                // --- Handle 404 (Not Found) ---
                await this.clearLicenseInfo();
                vscode.window.showInformationMessage("Your license key was not found and has been removed.  It may have been regenerated or revoked.");
                const licenseInfo = await this.getCurrentLicenseInfo(); // Fetch the updated (now null) license info
                this.onlineStatusListeners.forEach(listener => listener(true, licenseInfo));

            } else if (response.license_key.status === 'expired') {
                // --- Handle 400 (Expired) ---
                this.isExpired = true;
                await this.context.globalState.update('isExpired', true);

                if (!this.notificationShown) {
                    vscode.window.showWarningMessage('Your license has expired. Please renew to continue using premium features.');
                    this.notificationShown = true;
                    await this.context.globalState.update('expirationNotificationShown', true);
                }
                const updatedLicenseInfo: LicenseInfo = { // we create updatedLicenseInfo object to be stored
                    ...this.formatLicenseInfo(response),
                    temporarilyDisabled: this.isPremiumTemporarilyDisabled,
                    expired: true,
                };

                await this.context.globalState.update(CONFIG.STORAGE_KEYS.STORED_LICENSE_INFO, updatedLicenseInfo);
                const licenseInfo = await this.getCurrentLicenseInfo();
                this.onlineStatusListeners.forEach(listener => listener(true, licenseInfo));
            } else {
                await this.deactivateLicense();
            }
        } catch (error) {
            console.error('License validation failed (unexpected error):', error);
        }
    }

    private async storeLicenseInfo(licenseInfo: LicenseInfo): Promise<void> {
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.STORED_LICENSE_INFO, licenseInfo);
        this.isExpired = false;
        await this.context.globalState.update('isExpired', false);
        this.notificationShown = false;
        await this.context.globalState.update('expirationNotificationShown', false);
    }

    private formatLicenseInfo(data: LicenseResponse): LicenseInfo {
        return {
            valid: !!data.activated,
            licenseKey: data.license_key.key,
            instanceId: data.instance!.id,
            instanceName: data.instance!.name,
            status: data.license_key.status,
            expiresAt: data.license_key.expires_at,
            activationLimit: data.license_key.activation_limit,
            activationUsage: data.license_key.activation_usage,
            createdAt: data.license_key.created_at,
            productName: data.meta.product_name,
            customerName: data.meta.customer_name,
            customerEmail: data.meta.customer_email,
            temporarilyDisabled: false, // Always false on format
            expired: data.license_key.status === 'expired',
        };
    }

    public async deactivateLicense(): Promise<void> {
        const storedLicenseInfo = this.context.globalState.get<LicenseInfo>(CONFIG.STORAGE_KEYS.STORED_LICENSE_INFO);
        if (!storedLicenseInfo) return;

        const { licenseKey, instanceId } = storedLicenseInfo;

        try {
            await ApiService.deactivateLicense(licenseKey, instanceId);
            await this.clearLicenseInfo();
            vscode.window.showInformationMessage('License has been deactivated.');
        } catch (error) {
            console.error('Failed to deactivate license on server:', error);
            throw error; // Re-throw for UI handling
        }
    }

    private async clearLicenseInfo(): Promise<void> {
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.STORED_LICENSE_INFO, undefined);
        this.isPremiumTemporarilyDisabled = false;
        this.isExpired = false;
        await this.context.globalState.update('isPremiumTemporarilyDisabled', false);
        await this.context.globalState.update('isExpired', false);
        this.notificationShown = false;
        await this.context.globalState.update('expirationNotificationShown', false);
    }

    public dispose(): void {
        clearInterval(this.checkInterval);
        this.networkMonitor.dispose(); // Dispose the network monitor
    }

    public async isPremiumEnabled(): Promise<boolean> {
        const licenseInfo = await this.getCurrentLicenseInfo();
        return Boolean(licenseInfo?.valid && !licenseInfo.temporarilyDisabled && !licenseInfo.expired);
    }
}