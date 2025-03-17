// src/services/licenseService.ts
import * as vscode from 'vscode';
import { CONFIG, LicenseInfo } from '../config';
import { NetworkMonitor } from '../utils/networkMonitor';
import { ApiService } from './apiService';
import axios, { AxiosError } from 'axios';

export class LicenseService {
    private context: vscode.ExtensionContext;
    private lastOnlineCheck: number = Date.now();
    private checkInterval!: NodeJS.Timer;
    private networkMonitor: NetworkMonitor;
    private onlineStatusListeners: ((isOnline: boolean, licenseInfo?: LicenseInfo | null) => void)[] = [];
    private isPremiumTemporarilyDisabled: boolean = false;
    private isExpired: boolean = false;
    private notificationShown: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.isPremiumTemporarilyDisabled = context.globalState.get('isPremiumTemporarilyDisabled', false);
        this.isExpired = context.globalState.get('isExpired', false);
        this.notificationShown = context.globalState.get('expirationNotificationShown', false);
        this.networkMonitor = new NetworkMonitor();

        this.networkMonitor.on('statusChange', (isOnline: boolean) => {
            this.handleNetworkStatusChange(isOnline);
        });

        this.networkMonitor.on('offlineLimitExceeded', () => {
            this.temporarilyDisablePremiumFeatures();
        });
    }

    public initialize(): void {
        this.startOnlineChecking();
        this.checkInitialStatus();
    }

    public onOnlineStatusChange(listener: (isOnline: boolean, licenseInfo?: LicenseInfo | null) => void) {
        this.onlineStatusListeners.push(listener);
    }

    private startOnlineChecking(): void {
        this.checkInterval = setInterval(async () => {
            const isOnline = await this.checkOnlineStatus();
            const licenseInfo = await this.getCurrentLicenseInfo();
            this.onlineStatusListeners.forEach(listener => listener(isOnline, licenseInfo));

            if (isOnline) {
                this.lastOnlineCheck = Date.now();
                await this.validateCurrentLicense();
            } else {
                this.handleOfflineStatus();
            }
        }, CONFIG.TIMING.ONLINE_PING_INTERVAL);
    }

    private async checkInitialStatus(): Promise<void> {
        const isOnline = await this.checkOnlineStatus();
        const licenseInfo = await this.getCurrentLicenseInfo();
        this.onlineStatusListeners.forEach(listener => listener(isOnline, licenseInfo));

        if (isOnline && licenseInfo?.licenseKey) {
            await this.validateCurrentLicense();
        }
    }
    private async checkOnlineStatus(): Promise<boolean> {
        try {
            await axios.get(CONFIG.API_ENDPOINTS.PING);
            return true;
        } catch {
            return false;
        }
    }

    private async handleOfflineStatus(): Promise<void> {
        const offlineDuration = Date.now() - this.lastOnlineCheck;
        if (offlineDuration > CONFIG.TIMING.OFFLINE_DURATION_LIMIT) {
            await this.temporarilyDisablePremiumFeatures();
        }
    }

    private async temporarilyDisablePremiumFeatures(): Promise<void> {
        if (!this.isPremiumTemporarilyDisabled) {
            this.isPremiumTemporarilyDisabled = true;
            await this.context.globalState.update('isPremiumTemporarilyDisabled', true);
            vscode.window.showWarningMessage('Premium features temporarily disabled due to offline duration limit.');
        }

        const licenseInfo = await this.getCurrentLicenseInfo();
        this.onlineStatusListeners.forEach(listener => {
            listener(false, licenseInfo);
        });
    }
    private async getCurrentLicenseInfo(): Promise<LicenseInfo | null> {
        const licenseKey = this.context.globalState.get<string>(CONFIG.STORAGE_KEYS.LICENSE_KEY);
        const instanceId = this.context.globalState.get<string>(CONFIG.STORAGE_KEYS.INSTANCE_ID);
        const storedLicenseInfo = this.context.globalState.get<LicenseInfo>('stored_license_info');


        if (!licenseKey || !instanceId) {
            return null;
        }

        // Construct the return object using storedLicenseInfo, not individual properties
        return {
            valid: !this.isPremiumTemporarilyDisabled && !this.isExpired,
            licenseKey,
            instanceId,
            status: this.isPremiumTemporarilyDisabled ? 'inactive' : (this.isExpired ? 'expired' : 'active'),
            temporarilyDisabled: this.isPremiumTemporarilyDisabled,
            expired: this.isExpired,
            activationLimit: storedLicenseInfo?.activationLimit,
            activationUsage: storedLicenseInfo?.activationUsage,
            expiresAt: storedLicenseInfo?.expiresAt, // Get from stored info
            instanceName: storedLicenseInfo?.instanceName,
            createdAt: storedLicenseInfo?.createdAt,
            productName: storedLicenseInfo?.productName,
            customerName: storedLicenseInfo?.customerName,
            customerEmail: storedLicenseInfo?.customerEmail
        };
    }

    public async activateLicense(licenseKey: string): Promise<LicenseInfo> {
        try {
            const instanceName = `VSCode-${Date.now()}`;
            const response = await ApiService.activateLicense(licenseKey, instanceName);

            if (response.activated && response.instance?.id) {

                // --- KEY CHANGE: Validate Store and Product ID ---
                if (response.meta.store_id !== CONFIG.STORE_ID || response.meta.product_id !== CONFIG.PRODUCT_ID) {
                    throw new Error("This license key is not valid for this product.");
                }

                await this.storeLicenseInfo(licenseKey, response.instance.id);
                this.isExpired = false;
                await this.context.globalState.update('isExpired', false);
                this.notificationShown = false;
                await this.context.globalState.update('expirationNotificationShown', false);
                return this.formatLicenseInfo(response);
            }
            throw new Error(response.error || 'Activation failed: Missing instance data');
        } catch (error) {
            throw error;
        }
    }

    private async validateCurrentLicense(): Promise<void> {
        const licenseKey = this.context.globalState.get<string>(CONFIG.STORAGE_KEYS.LICENSE_KEY);
        const instanceId = this.context.globalState.get<string>(CONFIG.STORAGE_KEYS.INSTANCE_ID);

        if (!licenseKey || !instanceId) {
            return;
        }

        try {
            const response = await ApiService.validateLicense(licenseKey, instanceId);

            if (response.valid) {
                // --- Handle VALID License ---
                const updatedLicenseInfo: LicenseInfo = {
                    valid: true,
                    licenseKey: response.license_key.key,
                    instanceId: instanceId,
                    instanceName: response.instance?.name,
                    status: response.license_key.status,
                    expiresAt: response.license_key.expires_at,
                    activationLimit: response.license_key.activation_limit,
                    activationUsage: response.license_key.activation_usage,
                    createdAt: response.license_key.created_at,
                    productName: response.meta.product_name,
                    customerName: response.meta.customer_name,
                    customerEmail: response.meta.customer_email,
                    temporarilyDisabled: this.isPremiumTemporarilyDisabled,
                    expired: response.license_key.status === 'expired'
                };
                await this.context.globalState.update('stored_license_info', updatedLicenseInfo);

                if (this.isPremiumTemporarilyDisabled) {
                    this.isPremiumTemporarilyDisabled = false;
                    await this.context.globalState.update('isPremiumTemporarilyDisabled', false);
                    vscode.window.showInformationMessage('Premium features have been re-enabled.');
                }
                if (this.isExpired) {
                    this.isExpired = false;
                    await this.context.globalState.update('isExpired', false);
                    this.notificationShown = false;
                    await this.context.globalState.update('expirationNotificationShown', false);
                }
                this.onlineStatusListeners.forEach(listener => listener(true, updatedLicenseInfo));

            } else if (response.error === 'license_key not found.') {
                // --- Handle 404 (Not Found) ---
                await this.context.globalState.update(CONFIG.STORAGE_KEYS.LICENSE_KEY, undefined);
                await this.context.globalState.update(CONFIG.STORAGE_KEYS.INSTANCE_ID, undefined);
                await this.context.globalState.update('stored_license_info', undefined); // Clear stored info
                this.isExpired = false;
                this.isPremiumTemporarilyDisabled = false;
                await this.context.globalState.update('isPremiumTemporarilyDisabled', false);
                await this.context.globalState.update('isExpired', false);

                // Inform the user
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
                    valid: !!response.valid,
                    licenseKey: response.license_key.key,
                    instanceId: instanceId,
                    instanceName: response.instance?.name,
                    status: response.license_key.status,
                    expiresAt: response.license_key.expires_at,
                    activationLimit: response.license_key.activation_limit,
                    activationUsage: response.license_key.activation_usage,
                    createdAt: response.license_key.created_at,
                    productName: response.meta.product_name,
                    customerName: response.meta.customer_name,
                    customerEmail: response.meta.customer_email,
                    temporarilyDisabled: this.isPremiumTemporarilyDisabled,
                    expired: response.license_key.status === 'expired'
                };
                await this.context.globalState.update('stored_license_info', updatedLicenseInfo); //still update even if expired
                const licenseInfo = await this.getCurrentLicenseInfo();
                this.onlineStatusListeners.forEach(listener =>
                    listener(true, licenseInfo)
                );
            }
            else {
                // Handle other invalid cases (if any)
                // You might choose to deactivate, or show a different message, depending on the error.
                await this.deactivateLicense(); //keep this line of code
            }
        } catch (error) {
            console.error('License validation failed (unexpected error):', error);
        }
    }

    private async storeLicenseInfo(licenseKey: string, instanceId: string): Promise<void> {
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.LICENSE_KEY, licenseKey);
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.INSTANCE_ID, instanceId);
        this.isExpired = false;
        await this.context.globalState.update('isExpired', false);
        this.notificationShown = false;
        await this.context.globalState.update('expirationNotificationShown', false);
    }

    private formatLicenseInfo(data: any): LicenseInfo {
        const licenseInfo = {
            valid: !!data.activated,
            licenseKey: data.license_key.key,
            instanceId: data.instance.id,
            instanceName: data.instance.name,
            status: data.license_key.status,
            expiresAt: data.license_key.expires_at, // Directly from the response
            activationLimit: data.license_key.activation_limit,
            activationUsage: data.license_key.activation_usage,
            createdAt: data.license_key.created_at,
            productName: data.meta.product_name,
            customerName: data.meta.customer_name,
            customerEmail: data.meta.customer_email,
            temporarilyDisabled: this.isPremiumTemporarilyDisabled,
            expired: data.license_key.status === 'expired'
        };
        this.context.globalState.update('stored_license_info', licenseInfo); // Store
        return licenseInfo;
    }

    public async deactivateLicense(): Promise<void> {
        const licenseKey = this.context.globalState.get<string>(CONFIG.STORAGE_KEYS.LICENSE_KEY);
        const instanceId = this.context.globalState.get<string>(CONFIG.STORAGE_KEYS.INSTANCE_ID);

        if (licenseKey && instanceId) {
            try {
                await axios.post(CONFIG.API_ENDPOINTS.DEACTIVATE, {
                    license_key: licenseKey,
                    instance_id: instanceId
                });
                // Clear license info on explicit deactivation
                await this.context.globalState.update(CONFIG.STORAGE_KEYS.LICENSE_KEY, undefined);
                await this.context.globalState.update(CONFIG.STORAGE_KEYS.INSTANCE_ID, undefined);
                this.isPremiumTemporarilyDisabled = false;
                this.isExpired = false;
                await this.context.globalState.update('isExpired', false);
                this.notificationShown = false;
                await this.context.globalState.update('expirationNotificationShown', false);

                vscode.window.showInformationMessage('License has been deactivated.');
            } catch (error) {
                console.error('Failed to deactivate license on server:', error);
                throw error;
            }
        }
    }

    private async deactivatePremiumFeatures(reason: string = 'Unknown reason'): Promise<void> {
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.LICENSE_KEY, undefined);
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.INSTANCE_ID, undefined);
        vscode.window.showWarningMessage(`Premium features have been deactivated: ${reason}`);
    }

    public dispose(): void {
        clearInterval(this.checkInterval);
    }

    private async handleNetworkStatusChange(isOnline: boolean): Promise<void> {
        if (isOnline) {
            this.lastOnlineCheck = Date.now();
            await this.validateCurrentLicense();
            await this.context.globalState.update(CONFIG.STORAGE_KEYS.LAST_ONLINE, Date.now());
        } else {
            const lastOnline = this.context.globalState.get<number>(CONFIG.STORAGE_KEYS.LAST_ONLINE, Date.now());
            await this.context.globalState.update(CONFIG.STORAGE_KEYS.OFFLINE_START, lastOnline);
        }
        const licenseInfo = await this.getCurrentLicenseInfo();
        this.onlineStatusListeners.forEach(listener => listener(isOnline, licenseInfo));
    }

    public async isPremiumEnabled(): Promise<boolean> {
        const licenseInfo = await this.getCurrentLicenseInfo();
        return Boolean(licenseInfo?.valid && !licenseInfo.temporarilyDisabled && !licenseInfo.expired);
    }
}