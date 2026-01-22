import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../theme/colors';
import notificationService from '../services/notificationService';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

const defaultSettings = {
    newJobs: true,
    deliveryUpdates: true,
    earnings: true,
    dailyReminder: false,
    promotions: true,
    sound: true,
    vibration: true,
};

const NotificationSettingsScreen = ({ navigation }) => {
    const [settings, setSettings] = useState(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
            if (saved) {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            }
        } catch (error) {
            console.error('Error loading notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (newSettings) => {
        try {
            await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));

            // Handle daily reminder toggle
            if (newSettings.dailyReminder && !settings.dailyReminder) {
                await notificationService.scheduleDailyReminder(9, 0);
                Alert.alert('Daily Reminder Set', 'You will receive a reminder at 9:00 AM daily.');
            } else if (!newSettings.dailyReminder && settings.dailyReminder) {
                await notificationService.cancelAllNotifications();
            }
        } catch (error) {
            console.error('Error saving notification settings:', error);
        }
    };

    const toggleSetting = (key) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const SettingItem = ({ icon, title, description, settingKey, color = COLORS.primary }) => (
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
                trackColor={{ false: COLORS.border, true: `${COLORS.primary}60` }}
                thumbColor={settings[settingKey] ? COLORS.primary : COLORS.muted}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notification Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Notification Types */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>NOTIFICATION TYPES</Text>
                    <View style={styles.sectionCard}>
                        <SettingItem
                            icon="bicycle"
                            title="New Jobs"
                            description="Get notified when new delivery jobs are available"
                            settingKey="newJobs"
                            color="#10B981"
                        />
                        <SettingItem
                            icon="refresh"
                            title="Delivery Updates"
                            description="Status changes and customer messages"
                            settingKey="deliveryUpdates"
                            color="#3B82F6"
                        />
                        <SettingItem
                            icon="cash"
                            title="Earnings"
                            description="Payment confirmations and earnings updates"
                            settingKey="earnings"
                            color="#F59E0B"
                        />
                        <SettingItem
                            icon="megaphone"
                            title="Promotions"
                            description="Special offers and bonus opportunities"
                            settingKey="promotions"
                            color="#8B5CF6"
                        />
                    </View>
                </View>

                {/* Reminders */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>REMINDERS</Text>
                    <View style={styles.sectionCard}>
                        <SettingItem
                            icon="alarm"
                            title="Daily Reminder"
                            description="Get reminded to go online at 9:00 AM"
                            settingKey="dailyReminder"
                            color="#EC4899"
                        />
                    </View>
                </View>

                {/* Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PREFERENCES</Text>
                    <View style={styles.sectionCard}>
                        <SettingItem
                            icon="volume-high"
                            title="Sound"
                            description="Play sound for notifications"
                            settingKey="sound"
                        />
                        <SettingItem
                            icon="phone-portrait"
                            title="Vibration"
                            description="Vibrate for notifications"
                            settingKey="vibration"
                        />
                    </View>
                </View>

                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="information-circle" size={24} color={COLORS.primary} />
                    <Text style={styles.infoText}>
                        We recommend keeping job notifications on to never miss earning opportunities.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
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
        color: COLORS.white,
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
        color: COLORS.muted,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    sectionCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
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
        color: COLORS.text,
    },
    settingDescription: {
        fontSize: 12,
        color: COLORS.muted,
        marginTop: 2,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.primary}10`,
        margin: 16,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.text,
        lineHeight: 18,
    },
});

export default NotificationSettingsScreen;
