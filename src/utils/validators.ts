// src/utils/validators.ts
import { CONFIG } from '../config';

export class Validators {
    static isValidLicenseKey(key: string): boolean {
        const pattern = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
        return pattern.test(key);
    }

    static isPremiumFeature(feature: string): boolean {
        return CONFIG.FEATURES.PREMIUM.includes(feature);
    }
}