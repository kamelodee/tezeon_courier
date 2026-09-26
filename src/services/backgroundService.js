import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { ensureBackgroundLocationDisclosure } from '../utils/locationDisclosure';
import courierApi from './courierApi';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background location task
// This must be called in the global scope
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Background location error:', error);
        return;
    }
    if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
            const { latitude, longitude } = locations[0].coords;

            try {
                // Heartbeat + Location update
                await courierApi.updateLocation(latitude, longitude);
            } catch (err) {
                // Silently fail to avoid crashing the task
            }
        }
    }
});

class BackgroundService {
    /**
     * Start background location tracking and heartbeat
     */
    async startBackgroundUpdates() {
        try {
            // Check if task is already running
            const alreadyRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

            // First ensure foreground permission
            const { status: fgStatus } = await Location.getForegroundPermissionsAsync();

            if (fgStatus !== 'granted') {
                const { status: newFgStatus } = await Location.requestForegroundPermissionsAsync();
                if (newFgStatus !== 'granted') {
                    return {
                        success: false,
                        error: 'Foreground location permission is required. Please enable it in settings.'
                    };
                }
            }

            // Then background permission
            const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();

            if (bgStatus !== 'granted') {
                // Google Play requires a prominent disclosure BEFORE this
                // prompt, and the permissions declaration video has to show
                // it. Both entry points (Dashboard go-online and Location
                // Settings) reach the prompt through here, so it is gated in
                // one place rather than duplicated per screen.
                const disclosed = await ensureBackgroundLocationDisclosure();
                if (!disclosed) {
                    return {
                        success: false,
                        error: 'Background location is needed to receive jobs and keep customers updated while you ride.',
                    };
                }

                const { status: newBgStatus } = await Location.requestBackgroundPermissionsAsync();

                if (newBgStatus !== 'granted') {
                    return {
                        success: false,
                        error: Platform.OS === 'android'
                            ? 'Please set location permission to "Allow all the time" in settings to receive jobs while offline.'
                            : 'Background location permission is required.'
                    };
                }
            }

            // Start the background location task
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.Balanced,
                distanceInterval: 30,
                deferredUpdatesInterval: 30000,
                foregroundService: {
                    notificationTitle: 'Tezeon Courier is Online',
                    notificationBody: 'Your location is active so you can receive nearby delivery jobs.',
                    notificationColor: '#E86A33',
                },
                pausesUpdatesAutomatically: false,
                showsBackgroundLocationIndicator: true,
            });

            return { success: true };
        } catch (error) {
            console.error('Error starting background updates:', error);
            return { success: false, error: 'Failed to initialize location tracking.' };
        }
    }

    /**
     * Stop background location tracking
     */
    async stopBackgroundUpdates() {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (hasStarted) {
                await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
            }
            return { success: true };
        } catch (error) {
            console.error('Error stopping background updates:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if background updates are currently running
     */
    async isRunning() {
        return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
}

export default new BackgroundService();
