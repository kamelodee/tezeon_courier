import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import courierApi from './src/services/courierApi';

import App from './App';

const LOCATION_TRACKING = 'location-tracking';

TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
    if (error) {
        console.error('Background location error:', error);
        return;
    }

    // Check if background tracking is enabled in settings
    const enabled = await AsyncStorage.getItem('backgroundLocationEnabled');
    if (enabled === 'false') {
        // We should stop the task if it's disabled, but for now we just return early
        return;
    }

    if (data) {
        const { locations } = data;
        const location = locations[0];
        if (location) {
            try {
                // Update location on backend
                await courierApi.updateLocation(
                    location.coords.latitude,
                    location.coords.longitude
                );
                console.log('Background location updated:', location.coords.latitude, location.coords.longitude);
            } catch (err) {
                console.error('Failed to update background location:', err);
            }
        }
    }
});

registerRootComponent(App);
export { LOCATION_TRACKING };
