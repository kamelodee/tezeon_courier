/**
 * Courier API Service
 * Handles all API calls for courier app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';

const COURIER_URL = `${API_BASE_URL}/courier`;

class CourierAPI {
    async getAuthToken() {
        return await AsyncStorage.getItem('authToken');
    }

    async getHeaders() {
        const token = await this.getAuthToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // Auth
    async register(data) {
        try {
            const response = await fetch(`${COURIER_URL}/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            return { success: response.ok, data: result };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: error.message };
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok && data.access) {
                await AsyncStorage.setItem('authToken', data.access);
                await AsyncStorage.setItem('refreshToken', data.refresh);
                return { success: true, data };
            }
            return { success: false, error: data.detail || 'Login failed' };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async logout() {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
    }

    // Profile
    async getProfile() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/profile/me/`, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.data || data };
        } catch (error) {
            console.error('Get profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProfile(profileData) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/profile/me/`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(profileData)
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }

    // Online Status
    async goOnline() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/profile/go_online/`, {
                method: 'POST',
                headers
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Go online error:', error);
            return { success: false, error: error.message };
        }
    }

    async goOffline() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/profile/go_offline/`, {
                method: 'POST',
                headers
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Go offline error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateLocation(latitude, longitude) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/profile/update_location/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ latitude, longitude })
            });
            return { success: response.ok };
        } catch (error) {
            console.error('Update location error:', error);
            return { success: false };
        }
    }

    // Dashboard
    async getDashboard() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/dashboard/`, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.data || data };
        } catch (error) {
            console.error('Get dashboard error:', error);
            return { success: false, error: error.message };
        }
    }

    // Deliveries
    async getDeliveries(filters = {}) {
        try {
            const headers = await this.getHeaders();
            const params = new URLSearchParams(filters).toString();
            const url = `${COURIER_URL}/deliveries/${params ? '?' + params : ''}`;
            const response = await fetch(url, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.data || data.results || data };
        } catch (error) {
            console.error('Get deliveries error:', error);
            return { success: false, data: [] };
        }
    }

    async getActiveDeliveries() {
        return this.getDeliveries({ active: true });
    }

    async getAvailableDeliveries() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/deliveries/available/`, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.data || data.results || data };
        } catch (error) {
            console.error('Get available deliveries error:', error);
            return { success: false, data: [] };
        }
    }

    async getDeliveryDetails(id) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/deliveries/${id}/`, { headers });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Get delivery details error:', error);
            return { success: false, error: error.message };
        }
    }

    async acceptDelivery(id) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/deliveries/${id}/accept/`, {
                method: 'POST',
                headers
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Accept delivery error:', error);
            return { success: false, error: error.message };
        }
    }

    async pickupDelivery(id, notes = '') {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/deliveries/${id}/pickup/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ notes })
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Pickup delivery error:', error);
            return { success: false, error: error.message };
        }
    }

    async startTransit(id, latitude, longitude) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/deliveries/${id}/start_transit/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ latitude, longitude })
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Start transit error:', error);
            return { success: false, error: error.message };
        }
    }

    async arriveAtDestination(id) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/deliveries/${id}/arrive/`, {
                method: 'POST',
                headers
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Arrive error:', error);
            return { success: false, error: error.message };
        }
    }

    async completeDelivery(id, formData) {
        try {
            const token = await this.getAuthToken();
            const response = await fetch(`${COURIER_URL}/deliveries/${id}/complete/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Complete delivery error:', error);
            return { success: false, error: error.message };
        }
    }

    async failDelivery(id, reason) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/deliveries/${id}/fail/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ reason })
            });
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            console.error('Fail delivery error:', error);
            return { success: false, error: error.message };
        }
    }

    // Earnings
    async getEarnings() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/earnings/`, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.results || data };
        } catch (error) {
            console.error('Get earnings error:', error);
            return { success: false, data: [] };
        }
    }

    async getEarningsSummary() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/earnings/summary/`, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.data || data };
        } catch (error) {
            console.error('Get earnings summary error:', error);
            return { success: false, error: error.message };
        }
    }

    // History
    async getDeliveryHistory(page = 1) {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/history/?page=${page}`, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.data || data.results || data };
        } catch (error) {
            console.error('Get history error:', error);
            return { success: false, data: [] };
        }
    }

    // Ratings
    async getRatings() {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${COURIER_URL}/ratings/`, { headers });
            const data = await response.json();
            return { success: response.ok, data: data.results || data };
        } catch (error) {
            console.error('Get ratings error:', error);
            return { success: false, data: [] };
        }
    }
}

export default new CourierAPI();
