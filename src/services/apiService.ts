// File: src/services/apiService.ts

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
            // --- KEY CHANGE: Return API error message for 400/404 ---
            if (axios.isAxiosError(error) && error.response &&
                (error.response.status === 400 || error.response.status === 404)) {
                return error.response.data as LicenseResponse; // Return API response
            } else {
                throw error; // Re-throw other errors
            }
            // --- END KEY CHANGE ---
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
            // Handle 400 AND 404 Errors - return the response data
            if (axios.isAxiosError(error) && error.response &&
                (error.response.status === 400 || error.response.status === 404)) {
                return error.response.data as LicenseResponse;
            } else {
                throw error; // Re-throw other errors
            }
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
            // --- KEY CHANGE: Re-throw the original Axios error ---
            throw error; //  Re-throw the original Axios error.
        }
        return new Error('Unknown API error occurred');
    }
}