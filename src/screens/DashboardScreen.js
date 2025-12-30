import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Switch,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const DashboardScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profile, setProfile] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [isOnline, setIsOnline] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [profileRes, dashboardRes, deliveriesRes] = await Promise.all([
                courierApi.getProfile(),
                courierApi.getDashboard(),
                courierApi.getActiveDeliveries()
            ]);

            if (profileRes.success) {
                setProfile(profileRes.data);
                setIsOnline(profileRes.data.is_online);
            }
            if (dashboardRes.success) {
                setDashboard(dashboardRes.data);
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

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const toggleOnlineStatus = async () => {
        setTogglingStatus(true);
        try {
            const response = isOnline
                ? await courierApi.goOffline()
                : await courierApi.goOnline();

            if (response.success) {
                setIsOnline(!isOnline);
            } else {
                Alert.alert('Error', response.data?.error || 'Failed to update status');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setTogglingStatus(false);
        }
    };

    const StatCard = ({ icon, title, value, color = COLORS.primary }) => (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
        </View>
    );

    const DeliveryCard = ({ delivery }) => (
        <TouchableOpacity
            style={styles.deliveryCard}
            onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: delivery.id })}
        >
            <View style={styles.deliveryHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery.status) }]}>
                    <Text style={styles.statusText}>{delivery.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.deliveryEarning}>₵{parseFloat(delivery.courier_earning || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.deliveryBody}>
                <View style={styles.addressRow}>
                    <Ionicons name="location" size={16} color={COLORS.primary} />
                    <Text style={styles.addressText} numberOfLines={1}>{delivery.delivery_address}</Text>
                </View>
                <View style={styles.addressRow}>
                    <Ionicons name="person" size={16} color={COLORS.muted} />
                    <Text style={styles.contactText}>{delivery.delivery_contact_name}</Text>
                </View>
            </View>
            {delivery.is_cash_on_delivery && (
                <View style={styles.codBadge}>
                    <Ionicons name="cash" size={14} color={COLORS.warning} />
                    <Text style={styles.codText}>COD: ₵{parseFloat(delivery.cod_amount || 0).toFixed(2)}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    const getStatusColor = (status) => {
        const colors = {
            pending: COLORS.warning,
            accepted: COLORS.primary,
            picked_up: COLORS.primaryDark,
            in_transit: COLORS.secondary,
            arrived: COLORS.success,
            delivered: COLORS.success,
            failed: COLORS.error
        };
        return colors[status] || COLORS.muted;
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
                <View>
                    <Text style={styles.greeting}>Hello,</Text>
                    <Text style={styles.name}>{profile?.full_name || 'Courier'}</Text>
                </View>
                <View style={styles.onlineToggle}>
                    <Text style={[styles.onlineText, { color: isOnline ? COLORS.online : COLORS.offline }]}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                    {togglingStatus ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Switch
                            value={isOnline}
                            onValueChange={toggleOnlineStatus}
                            trackColor={{ false: COLORS.border, true: `${COLORS.online}50` }}
                            thumbColor={isOnline ? COLORS.online : COLORS.muted}
                        />
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="bicycle"
                        title="Today's Deliveries"
                        value={dashboard?.today_deliveries || 0}
                        color={COLORS.primary}
                    />
                    <StatCard
                        icon="cash"
                        title="Today's Earnings"
                        value={`₵${parseFloat(dashboard?.today_earnings || 0).toFixed(2)}`}
                        color={COLORS.success}
                    />
                    <StatCard
                        icon="time"
                        title="Pending"
                        value={dashboard?.pending_deliveries || 0}
                        color={COLORS.warning}
                    />
                    <StatCard
                        icon="star"
                        title="Rating"
                        value={parseFloat(dashboard?.average_rating || 5).toFixed(1)}
                        color={COLORS.secondary}
                    />
                </View>

                {/* Active Deliveries */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Active Deliveries</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    {activeDeliveries.length > 0 ? (
                        activeDeliveries.slice(0, 3).map((delivery) => (
                            <DeliveryCard key={delivery.id} delivery={delivery} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="bicycle-outline" size={48} color={COLORS.muted} />
                            <Text style={styles.emptyText}>No active deliveries</Text>
                            {isOnline && (
                                <TouchableOpacity
                                    style={styles.findButton}
                                    onPress={() => navigation.navigate('Available')}
                                >
                                    <Text style={styles.findButtonText}>Find Deliveries</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Available')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${COLORS.primary}15` }]}>
                                <Ionicons name="search" size={24} color={COLORS.primary} />
                            </View>
                            <Text style={styles.actionText}>Find Deliveries</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Earnings')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${COLORS.success}15` }]}>
                                <Ionicons name="wallet" size={24} color={COLORS.success} />
                            </View>
                            <Text style={styles.actionText}>Earnings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('History')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: `${COLORS.secondary}15` }]}>
                                <Ionicons name="time" size={24} color={COLORS.secondary} />
                            </View>
                            <Text style={styles.actionText}>History</Text>
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    greeting: { fontSize: 14, color: COLORS.muted },
    name: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
    onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    onlineText: { fontSize: 14, fontWeight: '600' },

    content: { flex: 1 },

    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
        gap: 10,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
    statTitle: { fontSize: 12, color: COLORS.muted, marginTop: 4 },

    section: { padding: 20, paddingTop: 10 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    seeAll: { fontSize: 14, color: COLORS.primary },

    deliveryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
    },
    deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },
    deliveryEarning: { fontSize: 16, fontWeight: 'bold', color: COLORS.success },
    deliveryBody: { gap: 6 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addressText: { flex: 1, fontSize: 14, color: COLORS.text },
    contactText: { fontSize: 13, color: COLORS.muted },
    codBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
    codText: { fontSize: 13, fontWeight: '600', color: COLORS.warning },

    emptyState: { alignItems: 'center', padding: 30, backgroundColor: COLORS.white, borderRadius: 12 },
    emptyText: { fontSize: 14, color: COLORS.muted, marginTop: 12 },
    findButton: { marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    findButtonText: { color: COLORS.white, fontWeight: '600' },

    actionsGrid: { flexDirection: 'row', gap: 12 },
    actionButton: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 16, alignItems: 'center' },
    actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    actionText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },

    earningsCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 20,
        margin: 20,
        marginTop: 10,
    },
    earningsLabel: { fontSize: 12, color: COLORS.white, opacity: 0.8 },
    earningsAmount: { fontSize: 28, fontWeight: 'bold', color: COLORS.white },
    successRate: { alignItems: 'flex-end' },
    successLabel: { fontSize: 12, color: COLORS.white, opacity: 0.8 },
    successValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.white },
});

export default DashboardScreen;
