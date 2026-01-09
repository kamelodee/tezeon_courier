import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../theme/colors';

const LocationSettingsScreen = ({ navigation }) => {
    const [backgroundEnabled, setBackgroundEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const enabled = await AsyncStorage.getItem('backgroundLocationEnabled');
            setBackgroundEnabled(enabled === 'true');

            const { status } = await Location.getBackgroundPermissionsAsync();
            setPermissionStatus(status);
        } catch (error) {
            console.error('Error loading location settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleBackgroundLocation = async (value) => {
        if (value) {
            // Request permissions
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                Alert.alert('Permission Required', 'Foreground location permission is needed to track your location.');
                return;
            }

            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                Alert.alert(
                    'Background Permission Required',
                    'To track location while the app is closed, please set location permission to "Allow all the time" in your device settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Location.requestBackgroundPermissionsAsync() }
                    ]
                );
                return;
            }
            setPermissionStatus('granted');
        }

        try {
            setBackgroundEnabled(value);
            await AsyncStorage.setItem('backgroundLocationEnabled', value.toString());

            if (value) {
                Alert.alert('Success', 'Background location tracking enabled. This help us sync your position with customers.');
            } else {
                Alert.alert('Disabled', 'Background location tracking has been disabled.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Location Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.section}>
                    <View style={styles.infoBox}>
                        <Ionicons name="location" size={32} color={COLORS.primary} />
                        <Text style={styles.infoText}>
                            Location services help us calculate delivery distances, provide accurate ETAs to customers, and assign nearby jobs to you.
                        </Text>
                    </View>

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Background Tracking</Text>
                            <Text style={styles.settingDescription}>
                                Allow the app to update your location even when it's in the background or closed.
                            </Text>
                        </View>
                        <Switch
                            value={backgroundEnabled}
                            onValueChange={toggleBackgroundLocation}
                            trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                            thumbColor={backgroundEnabled ? COLORS.white : '#F8FAFC'}
                        />
                    </View>

                    <View style={styles.permissionInfo}>
                        <Text style={styles.permissionLabel}>Permission Status:</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: permissionStatus === 'granted' ? `${COLORS.success}15` : `${COLORS.error}15` }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: permissionStatus === 'granted' ? COLORS.success : COLORS.error }
                            ]}>
                                {permissionStatus === 'granted' ? 'Enabled' : 'Not Granted'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>WHY WE NEED THIS</Text>
                    <View style={styles.featureItem}>
                        <Ionicons name="navigate-circle-outline" size={24} color={COLORS.muted} />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Accurate Navigation</Text>
                            <Text style={styles.featureDescription}>Better route suggestions and traffic avoidances.</Text>
                        </View>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="notifications-circle-outline" size={24} color={COLORS.muted} />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Job Assignments</Text>
                            <Text style={styles.featureDescription}>Receive jobs closest to your current position.</Text>
                        </View>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="people-circle-outline" size={24} color={COLORS.muted} />
                        <View style={styles.featureTextContainer}>
                            <Text style={styles.featureTitle}>Customer Trust</Text>
                            <Text style={styles.featureDescription}>Customers can track their orders in real-time.</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.disclaimer}>
                        Note: Background tracking may slightly increase battery consumption. We optimize updates to minimize this impact.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.primary,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
    content: { flex: 1 },
    section: {
        backgroundColor: COLORS.white,
        padding: 20,
        marginBottom: 20,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.primary}10`,
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 16,
    },
    infoText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    settingInfo: { flex: 1, marginRight: 20 },
    settingTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    settingDescription: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
    permissionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    permissionLabel: { fontSize: 14, color: COLORS.muted },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.muted,
        marginBottom: 16,
        letterSpacing: 1,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        gap: 12,
    },
    featureTextContainer: { flex: 1 },
    featureTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
    featureDescription: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },
    footer: { padding: 20, paddingBottom: 40 },
    disclaimer: {
        fontSize: 12,
        color: COLORS.muted,
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default LocationSettingsScreen;
