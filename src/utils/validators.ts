import { ExtensionConfig } from '../types/extensionConfig';
import { CONFIG } from '../config';

export class Validators {
    static isValidLicenseKey(key: string): boolean {
        const pattern = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
        return pattern.test(key);
    }

    static isOfflineDurationExceeded(config: ExtensionConfig): boolean {
        if (!config.offlineStartTimestamp) {
            return false;
        }

        const currentTime = Date.now();
        const offlineDuration = currentTime - config.offlineStartTimestamp;
        return offlineDuration > config.offlineDurationLimit;
    }

    static isPremiumFeature(feature: string): boolean {
        return CONFIG.FEATURES.PREMIUM.includes(feature);
    }
}
