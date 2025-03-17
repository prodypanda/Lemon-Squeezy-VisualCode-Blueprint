// src/services/apiService.ts
import axios, { AxiosError } from 'axios';
import { CONFIG } from '../config';
import { LicenseResponse } from '../types';

export class ApiService {
    private static headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
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
        return this.postRequest(CONFIG.API_ENDPOINTS.ACTIVATE, { license_key: licenseKey, instance_name: instanceName });
    }

    public static async validateLicense(licenseKey: string, instanceId: string): Promise<LicenseResponse> {
        return this.postRequest(CONFIG.API_ENDPOINTS.VALIDATE, { license_key: licenseKey, instance_id: instanceId });
    }

    public static async deactivateLicense(licenseKey: string, instanceId: string): Promise<LicenseResponse> {
        return this.postRequest(CONFIG.API_ENDPOINTS.DEACTIVATE, { license_key: licenseKey, instance_id: instanceId });
    }

    private static async postRequest(url: string, data: any): Promise<LicenseResponse> {
        try {
            const response = await axios.post(url, data, { headers: this.headers });
            return response.data; // Return data directly on success
        } catch (error) {
            this.handleApiError(error); // handleApiError now always throws
            throw error; // need this line to make the compiler happy and stop error.
        }
    }

    private static handleApiError(error: any): never { // Return type is 'never'
        if (axios.isAxiosError(error) && error.response && (error.response.status === 400 || error.response.status === 404)) {
            throw error.response.data;  // Throw the API response data as the error
        }
        throw error; // Re-throw other errors
    }
}