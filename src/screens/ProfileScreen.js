import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const ProfileScreen = ({ navigation }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
        const unsubscribe = navigation.addListener('focus', () => {
            loadProfile();
        });
        return unsubscribe;
    }, [navigation]);

    const loadProfile = async () => {
        try {
            const response = await courierApi.getProfile();
            if (response.success) {
                setProfile(response.data);
            }
        } catch (error) {
            console.error('Load profile error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await courierApi.logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }]
                        });
                    }
                }
            ]
        );
    };

    const MenuItem = ({ icon, title, subtitle, onPress, color = COLORS.text, showArrow = true }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            {showArrow && <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />}
        </TouchableOpacity>
    );

    const getVehicleIcon = (type) => {
        const icons = {
            motorcycle: 'bicycle',
            car: 'car',
            bicycle: 'bicycle',
            van: 'bus',
            truck: 'bus',
            foot: 'walk'
        };
        return icons[type] || 'bicycle';
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
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {profile?.profile_photo ? (
                            <Image source={{ uri: profile.profile_photo }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {profile?.full_name?.charAt(0) || 'C'}
                                </Text>
                            </View>
                        )}
                        <View style={[
                            styles.statusIndicator,
                            { backgroundColor: profile?.is_online ? COLORS.online : COLORS.offline }
                        ]} />
                    </View>
                    <Text style={styles.profileName}>{profile?.full_name || 'Courier'}</Text>
                    <Text style={styles.profileEmail}>{profile?.email}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="star" size={16} color={COLORS.warning} />
                            <Text style={styles.statValue}>{parseFloat(profile?.average_rating || 5).toFixed(1)}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="bicycle" size={16} color={COLORS.primary} />
                            <Text style={styles.statValue}>{profile?.total_deliveries || 0}</Text>
                            <Text style={styles.statLabel}>Deliveries</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                            <Text style={styles.statValue}>{profile?.success_rate || 100}%</Text>
                            <Text style={styles.statLabel}>Success</Text>
                        </View>
                    </View>
                </View>

                {/* Vehicle Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>VEHICLE</Text>
                    <View style={styles.vehicleCard}>
                        <View style={styles.vehicleIcon}>
                            <Ionicons name={getVehicleIcon(profile?.vehicle_type)} size={32} color={COLORS.primary} />
                        </View>
                        <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleType}>
                                {profile?.vehicle_type?.charAt(0).toUpperCase() + profile?.vehicle_type?.slice(1)}
                            </Text>
                            <Text style={styles.vehicleNumber}>{profile?.vehicle_number || 'No plate number'}</Text>
                        </View>
                        {profile?.is_verified && (
                            <View style={styles.verifiedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>
                    {profile?.license_number ? (
                        <View style={styles.licenseInfo}>
                            <Ionicons name="card-outline" size={16} color={COLORS.muted} />
                            <Text style={styles.licenseText}>License: {profile.license_number}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Menu Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="person-outline"
                            title="Edit Profile"
                            onPress={() => navigation.navigate('EditProfile', { profile })}
                        />
                        <MenuItem
                            icon="shield-checkmark-outline"
                            title="Identity & Verification"
                            subtitle={profile?.is_verified ? "Verified Account" : "Action required"}
                            onPress={() => navigation.navigate('Verification', { profile })}
                            color={profile?.is_verified ? COLORS.success : COLORS.warning}
                        />
                        <MenuItem
                            icon="wallet-outline"
                            title="Earnings"
                            subtitle={`₵${parseFloat(profile?.total_earnings || 0).toFixed(2)} total`}
                            onPress={() => navigation.navigate('Earnings')}
                            color={COLORS.success}
                        />
                        <MenuItem
                            icon="star-outline"
                            title="My Ratings"
                            subtitle={`${profile?.total_ratings || 0} reviews`}
                            onPress={() => { }}
                            color={COLORS.warning}
                        />
                        <MenuItem
                            icon="time-outline"
                            title="Delivery History"
                            onPress={() => navigation.navigate('Deliveries', { filter: 'history' })}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SETTINGS</Text>
                    <View style={styles.menuCard}>
                        <MenuItem
                            icon="notifications-outline"
                            title="Notifications"
                            onPress={() => { }}
                        />
                        <MenuItem
                            icon="location-outline"
                            title="Location Settings"
                            onPress={() => navigation.navigate('LocationSettings')}
                        />
                        <MenuItem
                            icon="help-circle-outline"
                            title="Help & Support"
                            onPress={() => { }}
                        />
                        <MenuItem
                            icon="document-text-outline"
                            title="Terms & Conditions"
                            onPress={() => { }}
                        />
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0</Text>

                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        backgroundColor: COLORS.primary,
        padding: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },

    content: { flex: 1 },

    profileCard: {
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatarContainer: { position: 'relative', marginBottom: 12 },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: 32, fontWeight: 'bold', color: COLORS.white },
    statusIndicator: {
        position: 'absolute',
        right: 2,
        bottom: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    profileName: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
    profileEmail: { fontSize: 14, color: COLORS.muted, marginTop: 4 },

    statsRow: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 4 },
    statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: COLORS.border },

    section: { padding: 16, paddingBottom: 0 },
    sectionTitle: { fontSize: 11, fontWeight: '600', color: COLORS.muted, marginBottom: 8, letterSpacing: 0.5 },

    vehicleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
    },
    vehicleIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vehicleInfo: { flex: 1, marginLeft: 12 },
    vehicleType: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    vehicleNumber: { fontSize: 14, color: COLORS.muted, marginTop: 2 },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${COLORS.success}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    verifiedText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
    licenseInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 8
    },
    licenseText: { fontSize: 14, color: COLORS.muted, fontWeight: '500' },

    menuCard: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden' },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    menuContent: { flex: 1, marginLeft: 12 },
    menuTitle: { fontSize: 15, color: COLORS.text },
    menuSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    logoutText: { fontSize: 16, fontWeight: '600', color: COLORS.error },

    version: { textAlign: 'center', color: COLORS.muted, marginTop: 16, fontSize: 12 },
});

export default ProfileScreen;
