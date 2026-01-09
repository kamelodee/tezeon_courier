/**
 * Courier API Service
 * Handles all API calls for courier app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';

const COURIER_URL = `/courier`;

class CourierAPI {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.onUnauthorized = null;
        this.refreshPromise = null;
    }

    async getAuthToken() {
        return await AsyncStorage.getItem('authToken');
    }

    async getHeaders(options = {}) {
        const token = await this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // Ensure token is not null, undefined or the literal string "null"
        if (token && token !== 'null' && token !== 'undefined') {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}, isRetry = false) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = await this.getHeaders(options);

        const config = {
            ...options,
            headers,
        };

        try {
            console.log(`📡 API Request: ${config.method || 'GET'} ${url}`);
            const response = await fetch(url, config);

            // Handle 401 Unauthorized - Attempt Token Refresh
            if (response.status === 401 && !isRetry) {
                console.log('🔄 Token expired, attempting refresh...');

                // If a refresh is already in progress, wait for it
                if (!this.refreshPromise) {
                    this.refreshPromise = this.refreshToken();
                }

                const refreshed = await this.refreshPromise;
                this.refreshPromise = null; // Reset for next time

                if (refreshed) {
                    return this.request(endpoint, options, true);
                }
            }

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error(`❌ Failed to parse response from ${endpoint}:`, text.substring(0, 100));
                if (response.status === 404) {
                    throw new Error(`Endpoint not found (404) at ${endpoint}`);
                }
                throw new Error(`Server returned invalid response format (${response.status})`);
            }

            if (!response.ok) {
                // If still 401 after retry or if it was a 401 we couldn't handle
                if (response.status === 401) {
                    await this.logout();
                }

                let errorMessage = data.detail || data.error || '';
                if (!errorMessage && typeof data === 'object') {
                    errorMessage = Object.keys(data)
                        .map(key => `${key}: ${Array.isArray(data[key]) ? data[key][0] : data[key]}`)
                        .join('\n');
                }
                throw new Error(errorMessage || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`❌ API Error for ${endpoint}:`, error.message);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const refresh = await AsyncStorage.getItem('refreshToken');
            if (!refresh) return false;

            const response = await fetch(`${this.baseURL}/auth/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.access) {
                    await AsyncStorage.setItem('authToken', data.access);
                    console.log('✅ Token refreshed successfully');
                    return true;
                }
            }

            // If refresh fails, logout
            console.warn('❌ Token refresh failed');
            await this.logout();
            return false;
        } catch (error) {
            console.error('Error refreshing token:', error);
            return false;
        }
    }

    // Auth
    async register(data) {
        // Try multiple endpoints if needed. Courier-specific registration is preferred
        const endpoints = ['/courier/register/', '/auth/register/'];
        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const result = await this.request(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                // If we used the fallback auth endpoint, we need to save the courier-specific 
                // data so we can create the profile later on the dashboard if needed.
                if (endpoint === '/auth/register/') {
                    await AsyncStorage.setItem('temp_courier_data', JSON.stringify({
                        phone: data.phone,
                        vehicle_type: data.vehicle_type,
                        vehicle_number: data.vehicle_number
                    }));
                }

                return { success: true, data: result };
            } catch (error) {
                console.warn(`Attempt at ${endpoint} failed:`, error.message);
                lastError = error;
                // If 404 or 500, try next endpoint
                if (error.message.includes('404') || error.message.includes('500') || error.message.includes('invalid response')) {
                    continue;
                }
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: lastError?.message || 'Registration failed' };
    }

    async login(email, password) {
        const endpoints = ['/auth/login/', '/auth/token/', '/login/'];
        let lastError = null;

        for (const endpoint of endpoints) {
            try {
                const data = await this.request(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });

                if (data.access || data.token) {
                    const token = data.access || data.token;
                    await AsyncStorage.setItem('authToken', token);
                    if (data.refresh) await AsyncStorage.setItem('refreshToken', data.refresh);
                    return { success: true, data };
                }
            } catch (error) {
                if (error.message.includes('status 404')) continue;
                return { success: false, error: error.message };
            }
        }
        return { success: false, error: lastError?.message || 'Login failed' };
    }

    async logout() {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
        if (this.onUnauthorized) {
            this.onUnauthorized();
        }
    }

    // Profile
    async getProfile() {
        try {
            const data = await this.request(`${COURIER_URL}/profile/me/`);
            return { success: true, data: data.data || data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createProfile(profileData) {
        try {
            // hitting /courier/profile/ with POST is the standard DRF way to create
            const data = await this.request(`${COURIER_URL}/profile/`, {
                method: 'POST',
                body: JSON.stringify(profileData)
            });
            // Also cleanup temp data if it exists
            await AsyncStorage.removeItem('temp_courier_data');
            return { success: true, data: data.data || data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateProfile(profileData) {
        try {
            const data = await this.request(`${COURIER_URL}/profile/me/`, {
                method: 'PATCH',
                body: JSON.stringify(profileData)
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateProfileWithDocuments(formData) {
        try {
            const token = await this.getAuthToken();
            const url = `${this.baseURL}${COURIER_URL}/profile/me/`;

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Online Status
    async goOnline() {
        try {
            const data = await this.request(`${COURIER_URL}/profile/go_online/`, { method: 'POST' });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async goOffline() {
        try {
            const data = await this.request(`${COURIER_URL}/profile/go_offline/`, { method: 'POST' });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateLocation(latitude, longitude) {
        try {
            await this.request(`${COURIER_URL}/profile/update_location/`, {
                method: 'POST',
                body: JSON.stringify({ latitude, longitude })
            });
            return { success: true };
        } catch (error) {
            return { success: false };
        }
    }

    // Dashboard
    async getDashboard() {
        try {
            const data = await this.request(`${COURIER_URL}/dashboard/`);
            return { success: true, data: data.data || data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Deliveries
    async getDeliveries(filters = {}) {
        try {
            const params = new URLSearchParams(filters).toString();
            const endpoint = `${COURIER_URL}/deliveries/${params ? '?' + params : ''}`;
            const data = await this.request(endpoint);
            return { success: true, data: data.data || data.results || data };
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    async getActiveDeliveries() {
        return this.getDeliveries({ active: true });
    }

    async getAvailableDeliveries() {
        try {
            const data = await this.request(`${COURIER_URL}/deliveries/available/`);
            return { success: true, data: data.data || data.results || data };
        } catch (error) {
            return { success: false, error: error.message, data: [] };
        }
    }

    async getDeliveryDetails(id) {
        try {
            const data = await this.request(`${COURIER_URL}/deliveries/${id}/`);
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async acceptDelivery(id) {
        try {
            const data = await this.request(`${COURIER_URL}/deliveries/${id}/accept/`, { method: 'POST' });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async pickupDelivery(id, notes = '') {
        try {
            const data = await this.request(`${COURIER_URL}/deliveries/${id}/pickup/`, {
                method: 'POST',
                body: JSON.stringify({ notes })
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async startTransit(id, latitude, longitude) {
        try {
            const data = await this.request(`${COURIER_URL}/deliveries/${id}/start_transit/`, {
                method: 'POST',
                body: JSON.stringify({ latitude, longitude })
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async arriveAtDestination(id) {
        try {
            const data = await this.request(`${COURIER_URL}/deliveries/${id}/arrive/`, { method: 'POST' });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async completeDelivery(id, formData) {
        try {
            // FormData requires bypassing JSON content-type
            const token = await this.getAuthToken();
            const url = `${this.baseURL}${COURIER_URL}/deliveries/${id}/complete/`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async failDelivery(id, reason) {
        try {
            const data = await this.request(`${COURIER_URL}/deliveries/${id}/fail/`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Earnings
    async getEarnings() {
        try {
            const data = await this.request(`${COURIER_URL}/earnings/`);
            return { success: true, data: data.results || data };
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    async getEarningsSummary() {
        try {
            const data = await this.request(`${COURIER_URL}/earnings/summary/`);
            return { success: true, data: data.data || data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // History
    async getDeliveryHistory(page = 1) {
        try {
            const data = await this.request(`${COURIER_URL}/history/?page=${page}`);
            return { success: true, data: data.data || data.results || data };
        } catch (error) {
            return { success: false, data: [] };
        }
    }

    // Ratings
    async getRatings() {
        try {
            const data = await this.request(`${COURIER_URL}/ratings/`);
            return { success: true, data: data.results || data };
        } catch (error) {
            return { success: false, data: [] };
        }
    }
}

export default new CourierAPI(API_BASE_URL);
