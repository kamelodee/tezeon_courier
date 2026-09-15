import React, { useState, useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../theme/colors';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import DeliveryDetailsScreen from '../screens/DeliveryDetailsScreen';
import FailedDeliveryScreen from '../screens/FailedDeliveryScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import VerificationScreen from '../screens/VerificationScreen';
import LocationSettingsScreen from '../screens/LocationSettingsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import RatingsScreen from '../screens/RatingsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import TermsScreen from '../screens/TermsScreen';
import VehicleSetupScreen from '../screens/VehicleSetupScreen';
import RoutePlanningScreen from '../screens/RoutePlanningScreen';
import PayoutScreen from '../screens/PayoutScreen';
import SupportTicketScreen from '../screens/SupportTicketScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MainTabNavigator from './MainTabNavigator';
import courierApi from '../services/courierApi';
import notificationService from '../services/notificationService';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
    const navigationRef = useNavigationContainerRef();

    useEffect(() => {
        checkAuth();
        initializeNotifications();

        // Listen for unauthorized status to logout globally
        courierApi.onUnauthorized = () => {
            setIsLoggedIn(false);
        };

        return () => {
            courierApi.onUnauthorized = null;
            notificationService.cleanup();
        };
    }, []);

    useEffect(() => {
        if (navigationRef) {
            notificationService.setNavigationRef(navigationRef);
        }
    }, [navigationRef]);

    const initializeNotifications = async () => {
        try {
            await notificationService.initialize();
        } catch (error) {
            console.error('Notification init error:', error);
        }
    };

    const checkAuth = async () => {
        try {
            const [token, onboardingStatus] = await Promise.all([
                AsyncStorage.getItem('authToken'),
                AsyncStorage.getItem('hasSeenOnboarding')
            ]);
            setHasSeenOnboarding(!!onboardingStatus);

            if (!token) {
                setIsLoggedIn(false);
                return;
            }

            // Validate the token is still usable by fetching the courier profile.
            // This also catches the case where an employee was assigned but the
            // token was stored before the CourierProfile existed.
            const profile = await courierApi.getProfile();
            if (profile.success) {
                setIsLoggedIn(true);
                // Store employee flag for use across the app
                const isEmployee = !!profile.data?.employer_name;
                await AsyncStorage.setItem('isEmployeeCourier', isEmployee ? 'true' : 'false');
            } else {
                // Token exists but profile is gone or not a courier — force re-login
                await courierApi.logout();
                setIsLoggedIn(false);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            setIsLoggedIn(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Determine initial route
    const getInitialRoute = () => {
        if (!hasSeenOnboarding) return 'Onboarding';
        if (isLoggedIn) return 'MainTabs';
        return 'Login';
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                initialRouteName={getInitialRoute()}
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="VehicleSetup" component={VehicleSetupScreen} />
                <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                <Stack.Screen
                    name="DeliveryDetails"
                    component={DeliveryDetailsScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="FailedDelivery"
                    component={FailedDeliveryScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="EditProfile"
                    component={EditProfileScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Verification"
                    component={VerificationScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="LocationSettings"
                    component={LocationSettingsScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="NotificationSettings"
                    component={NotificationSettingsScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Ratings"
                    component={RatingsScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="HelpSupport"
                    component={HelpSupportScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Terms"
                    component={TermsScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="RoutePlanning"
                    component={RoutePlanningScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Payout"
                    component={PayoutScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="SupportTicket"
                    component={SupportTicketScreen}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Notifications"
                    component={NotificationsScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
