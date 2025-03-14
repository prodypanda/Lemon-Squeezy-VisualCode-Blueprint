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

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        // Restore temporarily disabled state
        this.isPremiumTemporarilyDisabled = context.globalState.get('isPremiumTemporarilyDisabled', false);
        this.networkMonitor = new NetworkMonitor();

        this.networkMonitor.on('statusChange', (isOnline: boolean) => {
            this.handleNetworkStatusChange(isOnline);
        });

        this.networkMonitor.on('offlineLimitExceeded', () => {
            this.temporarilyDisablePremiumFeatures();
        });
    }

    public initialize(): void {
        // Start online checking
        this.startOnlineChecking();

        // Immediately check current status
        this.checkInitialStatus();
    }

    public onOnlineStatusChange(listener: (isOnline: boolean, licenseInfo?: LicenseInfo | null) => void) {
        this.onlineStatusListeners.push(listener);
    }

    private startOnlineChecking(): void {
        this.checkInterval = setInterval(async () => {
            const isOnline = await this.checkOnlineStatus();
            // Notify listeners of online status change
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

        // Update all listeners with initial status
        this.onlineStatusListeners.forEach(listener => {
            listener(isOnline, licenseInfo);
        });

        // If we're online and have a license, validate it
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
            // Only temporarily disable premium features
            await this.temporarilyDisablePremiumFeatures();
        }
    }

    private async temporarilyDisablePremiumFeatures(): Promise<void> {
        if (!this.isPremiumTemporarilyDisabled) {
            this.isPremiumTemporarilyDisabled = true;
            // Persist the disabled state
            await this.context.globalState.update('isPremiumTemporarilyDisabled', true);
            vscode.window.showWarningMessage('Premium features temporarily disabled due to offline duration limit.');
        }

        // Update UI with current license info
        const licenseInfo = await this.getCurrentLicenseInfo();
        this.onlineStatusListeners.forEach(listener => {
            // Pass both online status and license info
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

        return {
            valid: !this.isPremiumTemporarilyDisabled,
            licenseKey,
            instanceId,
            status: this.isPremiumTemporarilyDisabled ? 'inactive' : 'active',
            temporarilyDisabled: this.isPremiumTemporarilyDisabled,
            activationLimit: storedLicenseInfo?.activationLimit,
            activationUsage: storedLicenseInfo?.activationUsage,
            expiresAt: storedLicenseInfo?.expiresAt,
            // Add these stored properties
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
                await this.storeLicenseInfo(licenseKey, response.instance.id);
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
                // Update stored license info with latest data
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
                    temporarilyDisabled: this.isPremiumTemporarilyDisabled
                };

                await this.context.globalState.update('stored_license_info', updatedLicenseInfo);

                // Re-enable premium features if they were temporarily disabled
                if (this.isPremiumTemporarilyDisabled) {
                    this.isPremiumTemporarilyDisabled = false;
                    await this.context.globalState.update('isPremiumTemporarilyDisabled', false);
                    vscode.window.showInformationMessage('Premium features have been re-enabled.');
                }

                // Notify listeners of updated license info
                this.onlineStatusListeners.forEach(listener =>
                    listener(true, updatedLicenseInfo)
                );
            } else {
                await this.deactivateLicense();
            }
        } catch (error) {
            // Don't deactivate on network errors
            console.error('License validation failed:', error);
        }
    }

    private async storeLicenseInfo(licenseKey: string, instanceId: string): Promise<void> {
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.LICENSE_KEY, licenseKey);
        await this.context.globalState.update(CONFIG.STORAGE_KEYS.INSTANCE_ID, instanceId);
    }

    private formatLicenseInfo(data: any): LicenseInfo {
        const licenseInfo = {
            valid: true,
            licenseKey: data.license_key.key,
            instanceId: data.instance.id,
            instanceName: data.instance.name,
            status: data.license_key.status,
            expiresAt: data.license_key.expires_at,
            activationLimit: data.license_key.activation_limit,
            activationUsage: data.license_key.activation_usage,
            createdAt: data.license_key.created_at,
            productName: data.meta.product_name,
            customerName: data.meta.customer_name,
            customerEmail: data.meta.customer_email
        };

        // Store the full license info
        this.context.globalState.update('stored_license_info', licenseInfo);
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

                // Only remove license info on explicit deactivation
                await this.context.globalState.update(CONFIG.STORAGE_KEYS.LICENSE_KEY, undefined);
                await this.context.globalState.update(CONFIG.STORAGE_KEYS.INSTANCE_ID, undefined);
                this.isPremiumTemporarilyDisabled = false;

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
        return Boolean(licenseInfo?.valid && !licenseInfo.temporarilyDisabled);
    }
}
