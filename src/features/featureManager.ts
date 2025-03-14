import { FreeFeatures } from './freeFeatures';
import { PremiumFeatures } from './premiumFeatures';
import { CONFIG } from '../config';
import { FeatureResult } from '../types';

export class FeatureManager {
    public static async executeFeature(feature: string, isPremiumEnabled: boolean): Promise<FeatureResult> {
        try {
            if (CONFIG.FEATURES.PREMIUM.includes(feature) && !isPremiumEnabled) {
                return {
                    success: false,
                    message: CONFIG.UI.MESSAGES.LICENSE_REQUIRED
                };
            }

            switch (feature) {
                case 'characterCount':
                    return {
                        success: true,
                        message: `Character count: ${FreeFeatures.getCharacterCount()}`
                    };
                case 'wordCount':
                    return {
                        success: true,
                        message: `Word count: ${FreeFeatures.getWordCount()}`
                    };
                case 'toUpperCase':
                    await PremiumFeatures.convertToUpperCase();
                    return { success: true, message: 'Text converted to uppercase' };
                case 'toLowerCase':
                    await PremiumFeatures.convertToLowerCase();
                    return { success: true, message: 'Text converted to lowercase' };
                case 'base64Encode':
                    await PremiumFeatures.base64Encode();
                    return { success: true, message: 'Text encoded to base64' };
                case 'base64Decode':
                    await PremiumFeatures.base64Decode();
                    return { success: true, message: 'Text decoded from base64' };
                default:
                    return { success: false, message: 'Unknown feature' };
            }
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Feature execution failed'
            };
        }
    }
}
