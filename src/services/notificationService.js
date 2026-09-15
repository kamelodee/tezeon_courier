/**
 * Push Notification Service
 * Handles push notification registration, permissions, and local notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import courierApi from './courierApi';
import Constants from 'expo-constants';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

class NotificationService {
    constructor() {
        this.expoPushToken = null;
        this.notificationListener = null;
        this.responseListener = null;
    }

    /**
     * Initialize notification service
     * - Register for push notifications
     * - Set up notification listeners
     */
    async initialize() {
        // Register for push notifications
        const token = await this.registerForPushNotifications();

        if (token) {
            this.expoPushToken = token;
            // Save token to backend for sending push notifications
            await this.saveTokenToBackend(token);
        }

        // Set up notification received listener (foreground)
        this.notificationListener = Notifications.addNotificationReceivedListener(
            this.handleNotificationReceived
        );

        // Set up notification response listener (when user taps notification)
        this.responseListener = Notifications.addNotificationResponseReceivedListener(
            this.handleNotificationResponse
        );

        return token;
    }

    /**
     * Clean up listeners when unmounting
     */
    cleanup() {
        if (this.notificationListener) {
            this.notificationListener.remove();
        }
        if (this.responseListener) {
            this.responseListener.remove();
        }
    }

    /**
     * Register for push notifications
     */
    async registerForPushNotifications() {
        let token;

        // Check if we're on a physical device
        if (!Device.isDevice) {
            console.log('Push notifications require a physical device');
            return null;
        }

        // Set up Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF6D00',
            });

            // Channel for new delivery jobs
            await Notifications.setNotificationChannelAsync('new_jobs', {
                name: 'New Delivery Jobs',
                description: 'Notifications for new available deliveries',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 500, 200, 500],
                lightColor: '#4CAF50',
                sound: 'default',
            });

            // Channel for delivery updates
            await Notifications.setNotificationChannelAsync('delivery_updates', {
                name: 'Delivery Updates',
                description: 'Updates on your active deliveries',
                importance: Notifications.AndroidImportance.DEFAULT,
                lightColor: '#2196F3',
            });

            // Channel for earnings
            await Notifications.setNotificationChannelAsync('earnings', {
                name: 'Earnings',
                description: 'Notifications about your earnings',
                importance: Notifications.AndroidImportance.DEFAULT,
                lightColor: '#FF9800',
            });
        }

        // Check and request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Push notification permissions not granted');
            await AsyncStorage.setItem('pushNotificationsEnabled', 'false');
            return null;
        }

        await AsyncStorage.setItem('pushNotificationsEnabled', 'true');

        // Get Expo push token
        try {
            const projectId = Constants.expoConfig.extra.eas.projectId || Constants.manifest?.extra?.eas?.projectId;
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId
            })).data;
            console.log('Expo Push Token:', token);
        } catch (error) {
            console.error('Error getting push token:', error);
            return null;
        }

        return token;
    }

    /**
     * Save push token to backend
     */
    async saveTokenToBackend(token) {
        try {
            await AsyncStorage.setItem('expoPushToken', token);
            // Register token with backend so server can send targeted push notifications
            await courierApi.updatePushToken(token);
            if (__DEV__) console.log('Push token registered with backend');
        } catch (error) {
            console.error('Error saving push token:', error);
        }
    }

    /**
     * Handle notification received (foreground)
     */
    handleNotificationReceived = (notification) => {
        console.log('Notification received:', notification);

        const data = notification.request.content.data;

        // Handle different notification types
        switch (data?.type) {
            case 'new_job':
                // Play sound, vibrate, or trigger UI update
                break;
            case 'delivery_update':
                // Update delivery status in app
                break;
            case 'earnings':
                // Show earnings update
                break;
            default:
                break;
        }
    };

    /**
     * Handle notification response (user tapped notification)
     */
    handleNotificationResponse = (response) => {
        console.log('Notification tapped:', response);

        const data = response.notification.request.content.data;

        // Navigate based on notification type
        // This will be called with navigation reference from App.js
        if (!this.navigationRef) return;

        const deliveryId = data?.delivery_id || data?.assignment_id;

        // Backend-sent notifications (e.g. new delivery assignment) carry a
        // `screen` + `assignment_id` in their metadata - honor that first.
        if (data?.screen === 'DeliveryDetails' && deliveryId) {
            this.navigationRef.navigate('DeliveryDetails', { deliveryId });
            return;
        }

        switch (data?.type) {
            case 'new_job':
            case 'delivery_update':
            case 'shipping':
                if (deliveryId) {
                    this.navigationRef.navigate('DeliveryDetails', { deliveryId });
                } else {
                    this.navigationRef.navigate('Deliveries');
                }
                break;
            case 'earnings':
            case 'payment':
                this.navigationRef.navigate('Earnings');
                break;
            default:
                this.navigationRef.navigate('Home');
                break;
        }
    };

    /**
     * Set navigation reference for handling notification taps
     */
    setNavigationRef(ref) {
        this.navigationRef = ref;
    }

    /**
     * Schedule a local notification (for reminders, goals, etc.)
     */
    async scheduleLocalNotification({ title, body, data = {}, trigger = null, channelId = 'default' }) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
                ...(Platform.OS === 'android' && { channelId }),
            },
            trigger: trigger || { seconds: 1 },
        });
    }

    /**
     * Send new job notification
     */
    async notifyNewJob(delivery) {
        await this.scheduleLocalNotification({
            title: '🚚 New Delivery Available!',
            body: `₵${delivery.offered_price} - ${delivery.distance}km away`,
            data: { type: 'new_job', delivery_id: delivery.id },
            channelId: 'new_jobs',
        });
    }

    /**
     * Send goal reached notification
     */
    async notifyGoalReached(goalType, value) {
        const messages = {
            deliveries: {
                title: '🎉 Daily Goal Reached!',
                body: `You completed ${value} deliveries today! Amazing work!`,
            },
            earnings: {
                title: '💰 Earnings Goal Hit!',
                body: `You earned ₵${value} today! Keep it going!`,
            },
            streak: {
                title: '🔥 Streak Extended!',
                body: `You're on a ${value} day streak! Don't break it!`,
            },
        };

        const message = messages[goalType];
        if (message) {
            await this.scheduleLocalNotification({
                ...message,
                data: { type: 'goal_reached', goalType },
                channelId: 'earnings',
            });
        }
    }

    /**
     * Send delivery status update notification
     */
    async notifyDeliveryUpdate(delivery, status) {
        const messages = {
            accepted: `Delivery #${delivery.order_number} has been assigned to you`,
            picked_up: `Package for #${delivery.order_number} is ready for pickup`,
            delivered: `🎉 Delivery #${delivery.order_number} completed! +₵${delivery.courier_earning}`,
        };

        const body = messages[status];
        if (body) {
            await this.scheduleLocalNotification({
                title: 'Delivery Update',
                body,
                data: { type: 'delivery_update', delivery_id: delivery.id },
                channelId: 'delivery_updates',
            });
        }
    }

    /**
     * Schedule daily reminder notification
     */
    async scheduleDailyReminder(hour = 9, minute = 0) {
        // Cancel previous reminder
        await Notifications.cancelScheduledNotificationAsync('daily_reminder');

        await Notifications.scheduleNotificationAsync({
            identifier: 'daily_reminder',
            content: {
                title: '☀️ Good Morning!',
                body: 'Ready to start earning? Go online now and find deliveries!',
                data: { type: 'reminder' },
                sound: true,
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            },
        });
    }

    /**
     * Cancel all scheduled notifications
     */
    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    /**
     * Get scheduled notifications
     */
    async getScheduledNotifications() {
        return await Notifications.getAllScheduledNotificationsAsync();
    }

    /**
     * Clear notification badge
     */
    async clearBadge() {
        await Notifications.setBadgeCountAsync(0);
    }
}

export default new NotificationService();
