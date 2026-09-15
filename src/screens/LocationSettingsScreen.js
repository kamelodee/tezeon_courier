import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    Alert,
    Linking,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import backgroundService from '../services/backgroundService';
import { useTheme } from '../theme/ThemeContext';

const LOCATION_SETTINGS_KEY = 'location_settings';

const defaultSettings = {
    backgroundTracking: true,
    highAccuracy: false,
    batteryOptimization: true,
};

const LocationSettingsScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [foregroundPermission, setForegroundPermission] = useState(null);
    const [backgroundPermission, setBackgroundPermission] = useState(null);
    const [isBackgroundRunning, setIsBackgroundRunning] = useState(false);

    useEffect(() => {
        loadSettings();
        checkPermissions();
        checkBackgroundStatus();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem(LOCATION_SETTINGS_KEY);
            if (saved) {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            }
        } catch (error) {
            console.error('Error loading location settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkPermissions = async () => {
        try {
            const fg = await Location.getForegroundPermissionsAsync();
            const bg = await Location.getBackgroundPermissionsAsync();
            setForegroundPermission(fg.status);
            setBackgroundPermission(bg.status);
        } catch (error) {
            console.error('Error checking permissions:', error);
        }
    };

    const checkBackgroundStatus = async () => {
        try {
            const running = await backgroundService.isRunning();
            setIsBackgroundRunning(running);
        } catch (error) {
            console.error('Error checking background status:', error);
        }
    };

    const saveSettings = async (newSettings) => {
        try {
            await AsyncStorage.setItem(LOCATION_SETTINGS_KEY, JSON.stringify(newSettings));
        } catch (error) {
            console.error('Error saving location settings:', error);
        }
    };

    const toggleSetting = (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const requestForegroundPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setForegroundPermission(status);
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Location permission is needed to show your position on the map and find nearby jobs.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error('Error requesting foreground permission:', error);
        }
    };

    const requestBackgroundPermission = async () => {
        try {
            // First ensure foreground permission
            if (foregroundPermission !== 'granted') {
                await requestForegroundPermission();
                return;
            }

            const { status } = await Location.requestBackgroundPermissionsAsync();
            setBackgroundPermission(status);

            if (status !== 'granted') {
                Alert.alert(
                    'Background Permission Required',
                    Platform.OS === 'android'
                        ? 'Please select "Allow all the time" in settings to receive jobs while the app is closed.'
                        : 'Background location is needed to receive jobs and update your position while delivering.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error('Error requesting background permission:', error);
        }
    };

    const toggleBackgroundTracking = async () => {
        try {
            if (isBackgroundRunning) {
                await backgroundService.stopBackgroundUpdates();
                setIsBackgroundRunning(false);
                Alert.alert('Stopped', 'Background location tracking has been stopped.');
            } else {
                const result = await backgroundService.startBackgroundUpdates();
                if (result.success) {
                    setIsBackgroundRunning(true);
                    Alert.alert('Started', 'Background location tracking is now active.');
                } else {
                    Alert.alert('Error', result.error || 'Failed to start background tracking');
                }
            }
        } catch (error) {
            console.error('Error toggling background tracking:', error);
            Alert.alert('Error', 'Failed to toggle background tracking');
        }
    };

    const PermissionItem = ({ icon, title, description, status, onPress, color = colors.primary }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={[styles.settingIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
            <View style={[
                styles.statusBadge,
                { backgroundColor: status === 'granted' ? '#10B98120' : '#EF444420' }
            ]}>
                <Text style={[
                    styles.statusText,
                    { color: status === 'granted' ? '#10B981' : '#EF4444' }
                ]}>
                    {status === 'granted' ? 'Granted' : 'Not Granted'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const SettingItem = ({ icon, title, description, settingKey, color = colors.primary }) => (
        <View style={styles.settingItem}>
            <View style={[styles.settingIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
            <Switch
                value={!!settings[settingKey]}
                onValueChange={() => toggleSetting(settingKey)}
                trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                thumbColor={settings[settingKey] ? colors.primary : colors.muted}
            />
        </View>
    );

    const ActionItem = ({ icon, title, description, isActive, onPress, color = colors.primary }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={[styles.settingIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
            <View style={[
                styles.statusBadge,
                { backgroundColor: isActive ? '#10B98120' : '#6B728020' }
            ]}>
                <Text style={[
                    styles.statusText,
                    { color: isActive ? '#10B981' : '#6B7280' }
                ]}>
                    {isActive ? 'Active' : 'Inactive'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Location Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Permissions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PERMISSIONS</Text>
                    <View style={styles.sectionCard}>
                        <PermissionItem
                            icon="location"
                            title="Location Access"
                            description="Required to show your position on the map"
                            status={foregroundPermission}
                            onPress={requestForegroundPermission}
                            color="#3B82F6"
                        />
                        <PermissionItem
                            icon="navigate"
                            title="Background Location"
                            description="Receive jobs and track deliveries in background"
                            status={backgroundPermission}
                            onPress={requestBackgroundPermission}
                            color="#10B981"
                        />
                    </View>
                </View>

                {/* Background Tracking */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>BACKGROUND TRACKING</Text>
                    <View style={styles.sectionCard}>
                        <ActionItem
                            icon="pulse"
                            title="Location Updates"
                            description="Send your location when online to receive nearby jobs"
                            isActive={isBackgroundRunning}
                            onPress={toggleBackgroundTracking}
                            color="#8B5CF6"
                        />
                    </View>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PREFERENCES</Text>
                    <View style={styles.sectionCard}>
                        <SettingItem
                            icon="speedometer"
                            title="High Accuracy Mode"
                            description="Uses more battery but provides precise location"
                            settingKey="highAccuracy"
                            color="#F59E0B"
                        />
                        <SettingItem
                            icon="battery-charging"
                            title="Battery Optimization"
                            description="Reduce frequency when battery is low"
                            settingKey="batteryOptimization"
                            color="#EC4899"
                        />
                    </View>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={24} color={colors.primary} />
                    <Text style={styles.infoText}>
                        Background location is required to receive nearby delivery jobs and track your position during active deliveries. This helps customers know when to expect their orders.
                    </Text>
                </View>

                {/* Open Settings Button */}
                <TouchableOpacity style={styles.settingsButton} onPress={() => Linking.openSettings()}>
                    <Ionicons name="settings-outline" size={20} color={colors.white} />
                    <Text style={styles.settingsButtonText}>Open Device Settings</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
    },
    content: {
        flex: 1,
    },
    section: {
        padding: 16,
        paddingBottom: 0,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.muted,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    sectionCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    settingIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingContent: {
        flex: 1,
        marginLeft: 12,
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
    },
    settingDescription: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${colors.primary}10`,
        margin: 16,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
        lineHeight: 18,
    },
    settingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        marginHorizontal: 16,
        padding: 14,
        borderRadius: 12,
        gap: 8,
    },
    settingsButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.white,
    },
});

export default LocationSettingsScreen;
