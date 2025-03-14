import axios from 'axios';
import { CONFIG } from '../config';
import { LicenseResponse } from '../types';

export class ApiService {
    private static headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    public static async ping(): Promise<boolean> {
        try {
            await axios.get(CONFIG.API_ENDPOINTS.PING);
            return true;
        } catch {
            return false;
        }
    }

    public static async activateLicense(licenseKey: string, instanceName: string): Promise<LicenseResponse> {
        try {
            const response = await axios.post(
                CONFIG.API_ENDPOINTS.ACTIVATE,
                { license_key: licenseKey, instance_name: instanceName },
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    public static async validateLicense(licenseKey: string, instanceId: string): Promise<LicenseResponse> {
        try {
            const response = await axios.post(
                CONFIG.API_ENDPOINTS.VALIDATE,
                { license_key: licenseKey, instance_id: instanceId },
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    public static async deactivateLicense(licenseKey: string, instanceId: string): Promise<LicenseResponse> {
        try {
            const response = await axios.post(
                CONFIG.API_ENDPOINTS.DEACTIVATE,
                { license_key: licenseKey, instance_id: instanceId },
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    private static handleApiError(error: any): Error {
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.error || error.message;
            return new Error(`API Error: ${message}`);
        }
        return new Error('Unknown API error occurred');
    }
}
