import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    useWindowDimensions,
    Linking,
    Platform,
    Animated,
    Modal,
    TextInput,
    Image,
} from 'react-native';

const LOGO = require('../../assets/logo.png');
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import courierApi from '../services/courierApi';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import backgroundService from '../services/backgroundService';
import { useTheme } from '../theme/ThemeContext';

// Daily goal defaults
const DEFAULT_DAILY_GOAL = 5;
const DEFAULT_EARNINGS_GOAL = 50;

const DashboardScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [isOnline, setIsOnline] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
    const [earningsGoal, setEarningsGoal] = useState(DEFAULT_EARNINGS_GOAL);
    const [streak, setStreak] = useState(0);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editDeliveryGoal, setEditDeliveryGoal] = useState('');
    const [editEarningsGoal, setEditEarningsGoal] = useState('');
    const { width } = useWindowDimensions();
    const isTablet = width > 600;
    const isLargeTablet = width > 900;

    // Animation for progress
    const progressAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        const initialize = async () => {
            await loadGoalsFromStorage();
            await loadData();
            await updateCurrentLocation();
        };
        initialize();
    }, []);

    // Load saved goals from storage
    const loadGoalsFromStorage = async () => {
        try {
            const savedGoal = await AsyncStorage.getItem('dailyDeliveryGoal');
            const savedEarningsGoal = await AsyncStorage.getItem('dailyEarningsGoal');
            const savedStreak = await AsyncStorage.getItem('deliveryStreak');
            if (savedGoal) setDailyGoal(parseInt(savedGoal));
            if (savedEarningsGoal) setEarningsGoal(parseFloat(savedEarningsGoal));
            if (savedStreak) setStreak(parseInt(savedStreak));
        } catch (error) {
            console.log('Error loading goals:', error);
        }
    };

    // Animate progress bar
    useEffect(() => {
        if (dashboard) {
            const progress = Math.min((dashboard.today_deliveries || 0) / dailyGoal, 1);
            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 800,
                useNativeDriver: false,
            }).start();
        }
    }, [dashboard, dailyGoal]);

    // Effect to handle background tracking when online status changes
    useEffect(() => {
        const syncBackgroundUpdates = async () => {
            if (!loading) {
                if (isOnline) {
                    await backgroundService.startBackgroundUpdates();
                } else {
                    await backgroundService.stopBackgroundUpdates();
                }
            }
        };
        syncBackgroundUpdates();
    }, [isOnline, loading]);

    const updateCurrentLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let location = await Location.getCurrentPositionAsync({});
            await courierApi.updateLocation(
                location.coords.latitude,
                location.coords.longitude
            );
        } catch (error) {
            console.log('Location update error:', error);
        }
    };

    // Quick Navigation function
    const openNavigation = (lat, lng, address) => {
        if (!lat || !lng) {
            Alert.alert('No Location', 'Location coordinates are not available');
            return;
        }
        const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
        const defaultUrl = Platform.select({
            ios: `maps:0,0?q=${address}@${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(address)})`
        });

        Alert.alert(
            '🗺️ Navigate',
            'Choose navigation app',
            [
                { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) },
                { text: 'Waze', onPress: () => Linking.openURL(wazeUrl) },
                { text: 'Default Maps', onPress: () => Linking.openURL(defaultUrl) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const StatCard = ({ icon, title, value, color = colors.primary, style }) => (
        <View style={[styles.statCard, style]}>
            <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View style={styles.statTextContainer}>
                <Text
                    style={styles.statValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                >
                    {value}
                </Text>
                <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
            </View>
        </View>
    );

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d.toFixed(1);
    };

    const DeliveryCard = ({ delivery }) => {
        const nextDestLat = ['pending', 'accepted'].includes(delivery.status) ? delivery.pickup_latitude : delivery.delivery_latitude;
        const nextDestLng = ['pending', 'accepted'].includes(delivery.status) ? delivery.pickup_longitude : delivery.delivery_longitude;
        const nextAddress = ['pending', 'accepted'].includes(delivery.status) ? delivery.pickup_address : delivery.delivery_address;

        return (
            <TouchableOpacity
                style={styles.deliveryCardPremium}
                onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: delivery.id })}
            >
                <View style={styles.deliveryHeaderPremium}>
                    <View style={[styles.statusBadgePremium, { backgroundColor: getStatusColor(delivery.status) }]}>
                        <Text style={styles.statusTextPremium}>{delivery.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.deliveryEarningPremium}>₵{parseFloat(delivery.courier_earning || 0).toFixed(2)}</Text>
                </View>

                <View style={styles.deliveryPath}>
                    <View style={styles.pathIcon}>
                        <View style={[styles.pathDot, { backgroundColor: colors.success }]} />
                        <View style={styles.pathLine} />
                        <View style={[styles.pathDot, { backgroundColor: colors.error }]} />
                    </View>
                    <View style={styles.pathText}>
                        <Text style={styles.pathAddress} numberOfLines={1}>{delivery.pickup_address || 'Seller Location'}</Text>
                        <View style={{ height: 12 }} />
                        <Text style={styles.pathAddress} numberOfLines={1}>{delivery.delivery_address}</Text>
                    </View>
                </View>

                <View style={styles.deliveryFooterPremium}>
                    <View style={styles.customerRow}>
                        <Ionicons name="person" size={14} color={colors.muted} />
                        <Text style={styles.customerTextPremium}>{delivery.delivery_contact_name}</Text>
                    </View>

                    {/* Quick Navigate Button */}
                    <TouchableOpacity
                        style={styles.quickNavButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            openNavigation(nextDestLat, nextDestLng, nextAddress);
                        }}
                    >
                        <Ionicons name="navigate" size={16} color={colors.white} />
                        <Text style={styles.quickNavText}>Navigate</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return colors.warning;
            case 'accepted':
                return colors.info;
            case 'picked_up':
                return colors.secondary;
            case 'delivered':
                return colors.success;
            case 'cancelled':
                return colors.error;
            default:
                return colors.muted;
        }
    };

    const loadData = async () => {
        try {
            const [profileRes, dashboardRes, deliveriesRes] = await Promise.all([
                courierApi.getProfile(),
                courierApi.getDashboard(),
                courierApi.getActiveDeliveries()
            ]);

            if (profileRes.success) {
                setProfile(profileRes.data);
                setIsOnline(!!profileRes.data.is_online);
            }
            if (dashboardRes.success) {
                setDashboard(dashboardRes.data);
                // Check and update streak
                checkAndUpdateStreak(dashboardRes.data.today_deliveries || 0);
            }
            if (deliveriesRes.success) {
                setActiveDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []);
            }
        } catch (error) {
            console.error('Load data error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const checkAndUpdateStreak = async (todayDeliveries) => {
        try {
            const lastActiveDate = await AsyncStorage.getItem('lastActiveDate');
            const today = new Date().toDateString();

            if (lastActiveDate !== today && todayDeliveries > 0) {
                // New day with deliveries
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (lastActiveDate === yesterday.toDateString()) {
                    // Consecutive day - increment streak
                    const newStreak = streak + 1;
                    setStreak(newStreak);
                    await AsyncStorage.setItem('deliveryStreak', newStreak.toString());
                } else if (lastActiveDate !== today) {
                    // Streak broken - reset to 1
                    setStreak(1);
                    await AsyncStorage.setItem('deliveryStreak', '1');
                }
                await AsyncStorage.setItem('lastActiveDate', today);
            }
        } catch (error) {
            console.log('Streak update error:', error);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    // Unified background tracking is now handled by the centralized backgroundService

    const toggleOnlineStatus = async () => {
        // Verification Check
        if (!isOnline && !profile?.is_verified) {
            Alert.alert(
                'Verification Required',
                'You must upload your documents and be verified to go online.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Go to Verification', onPress: () => navigation.navigate('Verification', { profile }) }
                ]
            );
            return;
        }

        setTogglingStatus(true);
        try {
            if (!isOnline) {
                // Going Online
                const bgResponse = await backgroundService.startBackgroundUpdates();
                if (!bgResponse.success) {
                    Alert.alert('Permission Required', bgResponse.error);
                    setTogglingStatus(false);
                    return;
                }

                const response = await courierApi.goOnline();
                if (response.success) {
                    setIsOnline(true);
                } else {
                    await backgroundService.stopBackgroundUpdates();
                    Alert.alert('Error', response.error || 'Failed to go online');
                }
            } else {
                // Going Offline
                await backgroundService.stopBackgroundUpdates();
                const response = await courierApi.goOffline();
                if (response.success) {
                    setIsOnline(false);
                } else {
                    // Even if API fails, we keep the UI offline for local state consistency
                    setIsOnline(false);
                    Alert.alert('Offline', 'You are now offline (server update delayed)');
                }
            }
        } catch (error) {
            console.error('Toggle status error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setTogglingStatus(false);
        }
    };

    const openGoalModal = () => {
        setEditDeliveryGoal(String(dailyGoal));
        setEditEarningsGoal(String(earningsGoal));
        setShowGoalModal(true);
    };

    const saveGoals = async () => {
        const dg = parseInt(editDeliveryGoal);
        const eg = parseFloat(editEarningsGoal);
        if (!dg || dg < 1) { Alert.alert('Invalid', 'Delivery goal must be at least 1'); return; }
        if (!eg || eg < 1) { Alert.alert('Invalid', 'Earnings goal must be at least ₵1'); return; }
        setDailyGoal(dg);
        setEarningsGoal(eg);
        await AsyncStorage.setItem('dailyDeliveryGoal', String(dg));
        await AsyncStorage.setItem('dailyEarningsGoal', String(eg));
        setShowGoalModal(false);
    };

    // Calculate progress percentages
    const deliveryProgress = Math.min(((dashboard?.today_deliveries || 0) / dailyGoal) * 100, 100);
    const earningsProgress = Math.min(((dashboard?.today_earnings || 0) / earningsGoal) * 100, 100);
    const goalReached = (dashboard?.today_deliveries || 0) >= dailyGoal;

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.headerPremium}>
                <View style={styles.headerMain}>
                    <View style={styles.userInfo}>
                        <View style={styles.headerLogoRow}>
                            <Image source={LOGO} style={styles.headerLogo} resizeMode="contain" />
                            <Text style={styles.headerLogoName}>Tezeon</Text>
                        </View>
                        <Text style={styles.greetingHeader}>Welcome back,</Text>
                        <Text style={styles.userNameHeader}>{profile?.full_name?.split(' ')[0] || 'Courier'}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Notifications')}
                            style={styles.notifBtn}
                        >
                            <Ionicons name="notifications-outline" size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.statusControl}>
                        {togglingStatus ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <TouchableOpacity
                                onPress={toggleOnlineStatus}
                                style={[
                                    styles.statusToggleBtn,
                                    { backgroundColor: isOnline ? colors.success : '#94A3B8' }
                                ]}
                            >
                                <Ionicons
                                    name={isOnline ? "radio-button-on" : "radio-button-off"}
                                    size={16}
                                    color={colors.white}
                                />
                                <Text style={styles.statusToggleText}>
                                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                {isOnline && (
                    <View style={styles.onlineStatusInfo}>
                        <View style={styles.onlinePulse} />
                        <Text style={styles.onlineInfoText}>Receiving nearby jobs</Text>
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Daily Goal Progress Card */}
                <View style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <View style={styles.goalTitleRow}>
                            <Ionicons name="trophy" size={24} color={goalReached ? colors.warning : colors.primary} />
                            <Text style={styles.goalTitle}>Today's Goal</Text>
                            {streak > 0 && (
                                <View style={styles.streakBadge}>
                                    <Ionicons name="flame" size={14} color="#FF6B35" />
                                    <Text style={styles.streakText}>{streak} day streak</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {goalReached && (
                                <View style={styles.goalReachedBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                    <Text style={styles.goalReachedText}>Goal Reached!</Text>
                                </View>
                            )}
                            <TouchableOpacity onPress={openGoalModal} style={styles.editGoalBtn}>
                                <Ionicons name="pencil" size={14} color={colors.muted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Deliveries Progress */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Deliveries</Text>
                            <Text style={styles.progressValue}>
                                {dashboard?.today_deliveries || 0} / {dailyGoal}
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <Animated.View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: progressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%']
                                        }),
                                        backgroundColor: goalReached ? colors.success : colors.primary
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    {/* Earnings Progress */}
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>Earnings</Text>
                            <Text style={styles.progressValue}>
                                ₵{parseFloat(dashboard?.today_earnings || 0).toFixed(2)} / ₵{earningsGoal}
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${earningsProgress}%`,
                                        backgroundColor: earningsProgress >= 100 ? colors.success : colors.warning
                                    }
                                ]}
                            />
                        </View>
                    </View>

                    {/* Motivational Message */}
                    <Text style={styles.motivationText}>
                        {goalReached
                            ? "🎉 Amazing work! Keep the momentum going!"
                            : `${dailyGoal - (dashboard?.today_deliveries || 0)} more to hit your goal!`
                        }
                    </Text>
                </View>

                {/* Employee fleet badge */}
                {!!profile?.employer_name && (
                    <View style={styles.employeeBadge}>
                        <Ionicons name="business" size={16} color={colors.primary} />
                        <Text style={styles.employeeBadgeText}>
                            {profile.employer_name} Fleet
                        </Text>
                        <View style={styles.employeeVerifiedDot} />
                        <Text style={styles.employeeVerifiedText}>Verified</Text>
                    </View>
                )}

                {/* Verification Notice — only for freelance couriers who aren't verified */}
                {!profile?.is_verified && !profile?.employer_name && (
                    <TouchableOpacity
                        style={styles.verificationNotice}
                        onPress={() => navigation.navigate('Verification', { profile })}
                    >
                        <View style={styles.noticeIcon}>
                            <Ionicons name="alert-circle" size={24} color={colors.warning} />
                        </View>
                        <View style={styles.noticeContent}>
                            <Text style={styles.noticeTitle}>Complete Your Profile</Text>
                            <Text style={styles.noticeSubtitle}>Upload Ghana Card and License to get verified.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    </TouchableOpacity>
                )}

                {/* Stats Grid */}
                <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
                    <StatCard
                        icon="bicycle"
                        title="Today's Deliveries"
                        value={dashboard?.today_deliveries || 0}
                        color={colors.primary}
                        style={{ width: isTablet ? (width - 60) / 4 : (width - 40) / 2 }}
                    />
                    <StatCard
                        icon="cash"
                        title="Today's Earnings"
                        value={`₵${parseFloat(dashboard?.today_earnings || 0).toFixed(2)}`}
                        color={colors.success}
                        style={{ width: isTablet ? (width - 60) / 4 : (width - 40) / 2 }}
                    />
                    <StatCard
                        icon="time"
                        title="Pending"
                        value={dashboard?.pending_deliveries || 0}
                        color={colors.warning}
                        style={{ width: isTablet ? (width - 60) / 4 : (width - 40) / 2 }}
                    />
                    <StatCard
                        icon="star"
                        title="Rating"
                        value={parseFloat(dashboard?.average_rating || 5).toFixed(1)}
                        color={colors.secondary}
                        style={{ width: isTablet ? (width - 60) / 4 : (width - 40) / 2 }}
                    />
                </View>

                {/* Wallet Balance Card */}
                <TouchableOpacity
                    style={styles.walletCard}
                    onPress={() => navigation.navigate('Earnings')}
                >
                    <View style={styles.walletHeader}>
                        <View style={styles.walletIconContainer}>
                            <Ionicons name="wallet" size={28} color={colors.white} />
                        </View>
                        <View style={styles.walletInfo}>
                            <Text style={styles.walletLabel}>Wallet Balance</Text>
                            <Text style={styles.walletAmount}>
                                ₵{parseFloat(profile?.wallet_balance || 0).toFixed(2)}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
                    </View>

                    {/* Cash Collection Warning */}
                    {parseFloat(profile?.cash_collected || 0) > 0 && (
                        <View style={styles.cashWarning}>
                            <Ionicons name="alert-circle" size={18} color="#DC2626" />
                            <Text style={styles.cashWarningText}>
                                ₵{parseFloat(profile?.cash_collected).toFixed(2)} cash to remit
                            </Text>
                        </View>
                    )}

                    <View style={styles.walletStats}>
                        <View style={styles.walletStatItem}>
                            <Text style={styles.walletStatLabel}>Total Earned</Text>
                            <Text style={styles.walletStatValue}>
                                ₵{parseFloat(dashboard?.total_earnings || 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.walletStatDivider} />
                        <View style={styles.walletStatItem}>
                            <Text style={styles.walletStatLabel}>This Week</Text>
                            <Text style={styles.walletStatValue}>
                                ₵{parseFloat(dashboard?.week_earnings || 0).toFixed(2)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Route Planning Quick Access */}
                {activeDeliveries.length > 0 && (
                    <TouchableOpacity
                        style={styles.routePlanningCard}
                        onPress={() => navigation.navigate('RoutePlanning')}
                    >
                        <View style={styles.routePlanningContent}>
                            <View style={styles.routePlanningIconContainer}>
                                <Ionicons name="map" size={24} color={colors.white} />
                            </View>
                            <View style={styles.routePlanningTextContainer}>
                                <Text style={styles.routePlanningTitle}>Optimize Route</Text>
                                <Text style={styles.routePlanningSubtitle}>View all {activeDeliveries.length} stops on map</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Active Deliveries */}
                <View style={[styles.section, isTablet && styles.sectionTablet]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Active Deliveries</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={isTablet ? styles.deliveriesGridTablet : null}>
                        {activeDeliveries.length > 0 ? (
                            activeDeliveries.slice(0, 4).map((delivery) => (
                                <View key={delivery.id} style={isTablet ? { width: (width - 50) / 2 } : null}>
                                    <DeliveryCard delivery={delivery} />
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="bicycle-outline" size={48} color={colors.muted} />
                                <Text style={styles.emptyText}>No active deliveries</Text>
                                {!!isOnline && !profile?.employer_name && (
                                    <TouchableOpacity
                                        style={styles.findButton}
                                        onPress={() => navigation.navigate('Deliveries', { filter: 'available' })}
                                    >
                                        <Text style={styles.findButtonText}>Find Deliveries</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={[styles.section, isTablet && styles.sectionTablet]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                    </View>
                    <View style={[styles.actionsGrid, isTablet && styles.actionsGridTablet]}>
                        <TouchableOpacity
                            style={[styles.actionButton, isTablet && { flex: 0, width: (width - 80) / 3 }]}
                            onPress={() => navigation.navigate('Deliveries')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                                <Ionicons name="list" size={24} color={colors.primary} />
                            </View>
                            <Text style={styles.actionText}>All Deliveries</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, isTablet && { flex: 0, width: (width - 80) / 3 }]}
                            onPress={() => navigation.navigate('Earnings')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${colors.success}15` }]}>
                                <Ionicons name="wallet" size={24} color={colors.success} />
                            </View>
                            <Text style={styles.actionText}>Earnings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionButton, isTablet && { flex: 0, width: (width - 80) / 3 }]}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${colors.secondary}15` }]}>
                                <Ionicons name="person" size={24} color={colors.secondary} />
                            </View>
                            <Text style={styles.actionText}>My Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Total Earnings */}
                <View style={styles.earningsCard}>
                    <View>
                        <Text style={styles.earningsLabel}>Total Earnings</Text>
                        <Text style={styles.earningsAmount}>₵{parseFloat(dashboard?.total_earnings || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.successRate}>
                        <Text style={styles.successLabel}>Success Rate</Text>
                        <Text style={styles.successValue}>{dashboard?.success_rate || 100}%</Text>
                    </View>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Goal Edit Modal */}
            <Modal visible={showGoalModal} transparent animationType="slide">
                <View style={styles.goalModalOverlay}>
                    <View style={styles.goalModalCard}>
                        <Text style={styles.goalModalTitle}>Set Daily Goals</Text>
                        <Text style={styles.goalModalLabel}>Delivery Target</Text>
                        <TextInput
                            style={styles.goalModalInput}
                            value={editDeliveryGoal}
                            onChangeText={setEditDeliveryGoal}
                            keyboardType="number-pad"
                            placeholder="e.g. 5"
                        />
                        <Text style={styles.goalModalLabel}>Earnings Target (₵)</Text>
                        <TextInput
                            style={styles.goalModalInput}
                            value={editEarningsGoal}
                            onChangeText={setEditEarningsGoal}
                            keyboardType="decimal-pad"
                            placeholder="e.g. 80"
                        />
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                            <TouchableOpacity
                                style={[styles.goalModalBtn, { borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => setShowGoalModal(false)}
                            >
                                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.goalModalBtn, { backgroundColor: colors.primary }]}
                                onPress={saveGoals}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Save Goals</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerPremium: {
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    headerMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    notifBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerLogoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    headerLogo: {
        width: 28,
        height: 28,
        borderRadius: 6,
    },
    headerLogoName: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 0.4,
    },
    greetingHeader: {
        fontSize: 14,
        color: colors.muted,
        fontWeight: '500',
    },
    userNameHeader: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    statusToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    statusToggleText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    onlineStatusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        backgroundColor: `${colors.success}10`,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    onlinePulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    onlineInfoText: {
        fontSize: 12,
        color: colors.success,
        fontWeight: '600',
    },

    // Daily Goals Card Styles
    goalCard: {
        backgroundColor: colors.card,
        margin: 16,
        marginBottom: 8,
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    goalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    goalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    goalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
    },
    streakText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.primary,
    },
    goalReachedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.success}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
    },
    goalReachedText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.success,
    },
    progressSection: {
        marginBottom: 12,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    progressValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.primary,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: colors.background,
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    motivationText: {
        fontSize: 13,
        color: colors.muted,
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '500',
    },

    // Quick Navigate Button
    quickNavButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    quickNavText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.white,
    },

    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statTextContainer: {
        marginLeft: 10,
        flex: 1,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    statTitle: {
        fontSize: 10,
        color: colors.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    deliveryCardPremium: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deliveryHeaderPremium: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    statusBadgePremium: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusTextPremium: {
        color: colors.white,
        fontSize: 10,
        fontWeight: '900',
    },
    deliveryEarningPremium: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success,
    },
    deliveryPath: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    pathIcon: {
        alignItems: 'center',
        width: 20,
        marginRight: 12,
    },
    pathDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pathLine: {
        width: 2,
        flex: 1,
        backgroundColor: colors.background,
        marginVertical: 4,
    },
    pathText: {
        flex: 1,
    },
    pathAddress: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '500',
    },
    deliveryFooterPremium: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    customerTextPremium: {
        fontSize: 13,
        color: colors.muted,
    },
    marketTagSmall: {
        backgroundColor: `${colors.secondary}10`,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    marketTagTextSmall: {
        fontSize: 10,
        color: colors.secondary,
        fontWeight: 'bold',
    },

    content: { flex: 1 },
    employeeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.primary}10`,
        marginHorizontal: 16,
        marginBottom: 8,
        marginTop: 0,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${colors.primary}20`,
        gap: 6,
    },
    employeeBadgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
        flex: 1,
    },
    employeeVerifiedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
    },
    employeeVerifiedText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.success,
    },
    verificationNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.warning}10`,
        margin: 16,
        marginTop: 0,
        marginBottom: 8,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${colors.warning}20`,
    },
    noticeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.warning}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    noticeContent: {
        flex: 1,
    },
    noticeTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.text,
    },
    noticeSubtitle: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 15,
        justifyContent: 'space-between',
    },
    statsGridTablet: {
        paddingHorizontal: 20,
    },
    deliveriesGridTablet: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
    },
    section: { padding: 20, paddingTop: 10 },
    sectionTablet: {
        paddingHorizontal: 20,
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    seeAll: { fontSize: 14, color: colors.primary },

    deliveryCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.muted}10`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    distanceBadgeText: { fontSize: 11, color: colors.muted, fontWeight: '500' },
    deliveryEarning: { fontSize: 16, fontWeight: 'bold', color: colors.success },
    deliveryBody: { gap: 6 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressText: { flex: 1, fontSize: 14, color: colors.text },
    contactText: { fontSize: 13, color: colors.muted },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    codBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    codText: { fontSize: 13, fontWeight: '600', color: colors.warning },
    marketplaceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.secondary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    marketplaceBadgeText: { fontSize: 11, color: colors.secondary, fontWeight: '600' },

    emptyState: { alignItems: 'center', padding: 30, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    emptyText: { fontSize: 14, color: colors.muted, marginTop: 12 },
    findButton: { marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    findButtonText: { color: colors.white, fontWeight: '600' },

    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'space-between'
    },
    actionsGridTablet: {
        gap: 20,
    },
    actionButton: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionText: { fontSize: 12, color: colors.text, fontWeight: '500' },

    earningsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.primary,
        borderRadius: 20,
        padding: 24,
        margin: 15,
        marginTop: 10,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    earningsLabel: { fontSize: 12, color: colors.white, opacity: 0.8 },
    earningsAmount: { fontSize: 28, fontWeight: 'bold', color: colors.white },
    successRate: { alignItems: 'flex-end' },
    successLabel: { fontSize: 12, color: colors.white, opacity: 0.8 },
    successValue: { fontSize: 24, fontWeight: 'bold', color: colors.white },

    // Wallet Card Styles
    walletCard: {
        backgroundColor: colors.success,
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        elevation: 6,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    walletHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    walletIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    walletInfo: {
        flex: 1,
        marginLeft: 14,
    },
    walletLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    walletAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.white,
    },
    cashWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.error}20`,
        padding: 10,
        borderRadius: 10,
        marginTop: 14,
        gap: 8,
    },
    cashWarningText: {
        fontSize: 13,
        color: colors.error,
        fontWeight: '600',
    },
    walletStats: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    walletStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    walletStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    walletStatLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    walletStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
        marginTop: 4,
    },
    routePlanningCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    routePlanningContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routePlanningIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    routePlanningTextContainer: {
        flex: 1,
        marginLeft: 14,
    },
    routePlanningTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    routePlanningSubtitle: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 2,
    },
    editGoalBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: colors.background,
    },
    goalModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    goalModalCard: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    goalModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    goalModalLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    goalModalInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    goalModalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
});

export default DashboardScreen;
