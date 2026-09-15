import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import courierApi from '../services/courierApi';
import * as Location from 'expo-location';

const DeliveriesScreen = ({ navigation, route }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState(route.params?.filter || 'active');
    const [courierLocation, setCourierLocation] = useState(null);
    const [profile, setProfile] = useState(null);

    // History-specific state
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [dateFilter, setDateFilter] = useState('all'); // 'today', 'week', 'month', 'all'

    useEffect(() => {
        loadLocation();
        courierApi.getProfile().then(r => { if (r.success) setProfile(r.data); });
    }, []);

    const loadLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let location = await Location.getCurrentPositionAsync({});
            setCourierLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        } catch (error) {
            console.log('Location error:', error);
        }
    };

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

    useEffect(() => {
        if (route.params?.filter) {
            setFilter(route.params.filter);
        }
    }, [route.params?.filter]);

    useEffect(() => {
        // Reset history pagination when filter changes
        if (filter === 'history') {
            setHistoryPage(1);
            setDeliveries([]);
        }
        loadDeliveries();
    }, [filter, dateFilter]);

    // Filter deliveries by date for history
    const filterByDate = (data) => {
        if (filter !== 'history' || dateFilter === 'all') return data;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        return data.filter(item => {
            const deliveryDate = new Date(item.delivered_at || item.failed_at || item.created_at);
            switch (dateFilter) {
                case 'today':
                    return deliveryDate >= today;
                case 'week':
                    return deliveryDate >= weekAgo;
                case 'month':
                    return deliveryDate >= monthAgo;
                default:
                    return true;
            }
        });
    };

    // Calculate history stats
    const historyStats = useMemo(() => {
        if (filter !== 'history' || deliveries.length === 0) {
            return { completed: 0, failed: 0, earnings: 0 };
        }

        const completed = deliveries.filter(d => d.status === 'delivered').length;
        const failed = deliveries.filter(d => d.status === 'failed').length;
        const earnings = deliveries
            .filter(d => d.status === 'delivered')
            .reduce((sum, d) => sum + parseFloat(d.courier_earning || 0), 0);

        return { completed, failed, earnings };
    }, [deliveries, filter]);

    const loadDeliveries = async (page = 1) => {
        try {
            let response;
            if (filter === 'active') {
                response = await courierApi.getActiveDeliveries();
            } else if (filter === 'available') {
                response = await courierApi.getAvailableDeliveries();
            } else {
                response = await courierApi.getDeliveryHistory(page);
            }

            if (response.success) {
                let data = Array.isArray(response.data) ? response.data : [];

                if (filter === 'history') {
                    data = filterByDate(data);
                    setHistoryTotal(response.total || data.length);
                    if (page === 1) {
                        setDeliveries(data);
                    } else {
                        setDeliveries(prev => [...prev, ...data]);
                    }
                } else if (filter === 'available') {
                    const isEmployee = !!profile?.employer_name;
                    // Only show the premium upgrade prompt for freelance couriers
                    if (!isEmployee && !response.is_premium && response.is_freelance) {
                        setDeliveries([]);
                        Alert.alert(
                            'Unlock Earning',
                            'To accept jobs on the Delivery Marketplace, you need to upgrade to Premium.',
                            [
                                { text: 'Later', style: 'cancel' },
                                { text: 'Upgrade Now', onPress: () => navigation.navigate('Earnings') }
                            ]
                        );
                    } else {
                        setDeliveries(data);
                    }
                } else {
                    setDeliveries(data);
                }
            } else if (filter === 'available' && response.error?.includes('must be online')) {
                setDeliveries([]);
                Alert.alert(
                    'Offline',
                    'You must be online to see available deliveries.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Go Online',
                            onPress: async () => {
                                setLoading(true);
                                const res = await courierApi.goOnline();
                                if (res.success) {
                                    loadDeliveries();
                                } else {
                                    setLoading(false);
                                    Alert.alert('Error', res.error || 'Failed to go online');
                                }
                            }
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('Load deliveries error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };


    const loadMoreHistory = () => {
        if (filter !== 'history' || loadingMore || deliveries.length >= historyTotal) return;

        setLoadingMore(true);
        const nextPage = historyPage + 1;
        setHistoryPage(nextPage);
        loadDeliveries(nextPage);
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        if (filter === 'history') {
            setHistoryPage(1);
        }
        loadDeliveries();
    }, [filter, dateFilter]);

    const getStatusColor = (status) => {
        const colorMap = {
            pending: colors.warning,
            accepted: colors.primary,
            picked_up: colors.primaryDark,
            in_transit: colors.secondary,
            arrived: colors.success,
            delivered: colors.success,
            failed: colors.error,
            cancelled: colors.muted,
            returned: colors.warning
        };
        return colorMap[status] || colors.muted;
    };

    const getStatusIcon = (status) => {
        const icons = {
            pending: 'time-outline',
            accepted: 'checkmark-circle-outline',
            picked_up: 'cube-outline',
            in_transit: 'bicycle-outline',
            arrived: 'location-outline',
            delivered: 'checkmark-done-circle',
            failed: 'close-circle-outline',
            cancelled: 'ban-outline',
            returned: 'return-down-back-outline'
        };
        return icons[status] || 'help-circle-outline';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        if (date >= today) {
            return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (date >= yesterday) {
            return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    };

    // Format scheduled pickup time
    const formatScheduledTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        if (date >= today && date < tomorrow) {
            return `Today at ${timeStr}`;
        } else if (date >= tomorrow && date < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) {
            return `Tomorrow at ${timeStr}`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` at ${timeStr}`;
        }
    };

    const getOrderSourceIcon = (source) => {
        const icons = {
            whatsapp: 'logo-whatsapp',
            phone: 'call-outline',
            facebook: 'logo-facebook',
            instagram: 'logo-instagram',
            walk_in: 'walk-outline',
            website: 'globe-outline',
            other: 'storefront-outline',
        };
        return icons[source] || 'storefront-outline';
    };

    const getOrderSourceShortLabel = (source) => {
        const labels = {
            whatsapp: 'WhatsApp',
            phone: 'Phone',
            facebook: 'Facebook',
            instagram: 'Instagram',
            walk_in: 'Walk-in',
            website: 'Website',
            other: 'Sales',
        };
        return labels[source] || 'Sales';
    };

    const renderDelivery = ({ item }) => {
        const isHistory = filter === 'history';
        const nextDestLat = ['pending', 'accepted'].includes(item.status) ? item.pickup_latitude : item.delivery_latitude;
        const nextDestLng = ['pending', 'accepted'].includes(item.status) ? item.pickup_longitude : item.delivery_longitude;
        const distance = (!isHistory && courierLocation && nextDestLat) ? calculateDistance(courierLocation.latitude, courierLocation.longitude, nextDestLat, nextDestLng) : null;

        // Check if this is a scheduled delivery
        const isScheduled = item.is_scheduled && item.scheduled_pickup_time;

        return (
            <TouchableOpacity
                style={[
                    styles.deliveryCard,
                    { backgroundColor: colors.white },
                    isHistory && item.status === 'delivered' && styles.deliveryCardSuccess,
                    isHistory && item.status === 'failed' && styles.deliveryCardFailed,
                    isScheduled && styles.deliveryCardScheduled
                ]}
                onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
            >
                {/* Scheduled Badge */}
                {isScheduled && (
                    <View style={styles.scheduledBanner}>
                        <Ionicons name="calendar-outline" size={14} color={colors.white} />
                        <Text style={styles.scheduledBannerText}>
                            Scheduled: {formatScheduledTime(item.scheduled_pickup_time)}
                        </Text>
                    </View>
                )}

                <View style={styles.cardHeader}>
                    <View style={styles.orderInfo}>
                        <Text style={[styles.orderNumber, { color: colors.text }]}>{item.order_number || `Order #${item.id?.slice(0, 8)}`}</Text>
                        <View style={styles.headerMetadata}>
                            <Text style={styles.customerName}>{item.customer_name}</Text>
                            {distance && (
                                <Text style={styles.distanceText}> • {distance} km away</Text>
                            )}
                            {isHistory && (
                                <Text style={styles.dateText}>
                                    {formatDate(item.delivered_at || item.failed_at || item.created_at)}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Ionicons name={getStatusIcon(item.status)} size={12} color="#fff" />
                        <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.locationRow}>
                        <View style={styles.locationDot}>
                            <View style={[styles.dot, { backgroundColor: colors.success }]} />
                            <View style={styles.line} />
                            <View style={[styles.dot, { backgroundColor: colors.error }]} />
                        </View>
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationLabel}>Pickup</Text>
                            <Text style={styles.locationText} numberOfLines={1}>
                                {item.pickup_address || 'Seller Location'}
                            </Text>
                            <View style={styles.spacer} />
                            <Text style={styles.locationLabel}>Delivery</Text>
                            <Text style={styles.locationText} numberOfLines={1}>
                                {item.delivery_address}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.tagsRow}>
                        {!!item.is_marketplace && (
                            <View style={styles.marketplaceTag}>
                                <Ionicons name="globe-outline" size={12} color={colors.white} />
                                <Text style={styles.marketplaceText}>Marketplace</Text>
                            </View>
                        )}
                        {item.order_type === 'website' && (
                            <View style={styles.websiteOrderTag}>
                                <Ionicons name="globe-outline" size={12} color={colors.white} />
                                <Text style={styles.websiteOrderText}>Website</Text>
                            </View>
                        )}
                        {item.order_type === 'sales' && item.order_source && (
                            <View style={styles.salesOrderTag}>
                                <Ionicons name={getOrderSourceIcon(item.order_source)} size={12} color={colors.white} />
                                <Text style={styles.salesOrderText}>{getOrderSourceShortLabel(item.order_source)}</Text>
                            </View>
                        )}
                        {!item.is_marketplace && !isHistory && (
                            <View style={styles.contactInfo}>
                                <Ionicons name="call-outline" size={14} color={colors.muted} />
                                <Text style={styles.contactText}>{item.delivery_contact_phone}</Text>
                            </View>
                        )}
                        {isHistory && item.rating && (
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={12} color="#FFB800" />
                                <Text style={styles.ratingText}>{item.rating.rating}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.earningsInfo}>
                        {!!item.is_cash_on_delivery && (
                            <View style={styles.codTag}>
                                <Text style={styles.codTagText}>COD</Text>
                            </View>
                        )}
                        <Text style={[
                            styles.earningsText,
                            isHistory && item.status === 'delivered' && { color: colors.success }
                        ]}>
                            {isHistory && item.status === 'delivered' ? '+' : ''}₵{parseFloat(item.offered_price || item.courier_earning || 0).toFixed(2)}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const FilterTab = ({ status, label, icon }) => {
        const active = filter === status;
        return (
            <TouchableOpacity
                style={[
                    styles.filterTab,
                    { backgroundColor: active ? colors.primary : `${colors.primary}10` }
                ]}
                onPress={() => setFilter(status)}
            >
                <Ionicons name={icon} size={18} color={active ? colors.white : colors.primary} />
                <Text style={[styles.filterTabText, { color: active ? colors.white : colors.primary }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const DateFilterChip = ({ value, label }) => (
        <TouchableOpacity
            style={[styles.dateChip, dateFilter === value && styles.dateChipActive]}
            onPress={() => setDateFilter(value)}
        >
            <Text
                style={[styles.dateChipText, dateFilter === value && styles.dateChipTextActive]}
                numberOfLines={1}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderHistoryHeader = () => {
        if (filter !== 'history') return null;

        return (
            <View style={styles.historyHeader}>
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: `${colors.success}15` }]}>
                        <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
                        <Text style={styles.statValue}>{historyStats.completed}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: `${colors.error}15` }]}>
                        <Ionicons name="close-circle" size={24} color={colors.error} />
                        <Text style={styles.statValue}>{historyStats.failed}</Text>
                        <Text style={styles.statLabel}>Failed</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: `${colors.primary}15` }]}>
                        <Ionicons name="wallet" size={24} color={colors.primary} />
                        <Text style={styles.statValue}>₵{historyStats.earnings.toFixed(2)}</Text>
                        <Text style={styles.statLabel}>Earned</Text>
                    </View>
                </View>

                {/* Date Filter */}
                <View style={styles.dateFilterRow}>
                    <DateFilterChip value="today" label="Today" />
                    <DateFilterChip value="week" label="This Week" />
                    <DateFilterChip value="month" label="This Month" />
                    <DateFilterChip value="all" label="All Time" />
                </View>
            </View>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.primary }]}>
                <Text style={styles.headerTitle}>Deliveries</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <FilterTab status="active" label="Active" icon="bicycle-outline" />
                <FilterTab
                    status="available"
                    label={profile?.employer_name ? 'Assigned' : 'Available'}
                    icon={profile?.employer_name ? 'list-outline' : 'search-outline'}
                />
                <FilterTab status="history" label="History" icon="time-outline" />
            </View>

            {/* History Header with Stats and Date Filter */}
            {renderHistoryHeader()}

            {/* Deliveries List */}
            <FlatList
                data={deliveries}
                renderItem={renderDelivery}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                onEndReached={filter === 'history' ? loadMoreHistory : undefined}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons
                            name={filter === 'available' ? 'search-outline' : filter === 'history' ? 'time-outline' : 'cube-outline'}
                            size={64}
                            color={colors.muted}
                        />
                        <Text style={styles.emptyTitle}>
                            {filter === 'active' ? 'No Active Deliveries' :
                                filter === 'available' ? 'No Pending Orders' :
                                    'No Delivery History'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {filter === 'active'
                                ? (profile?.employer_name
                                    ? 'Your employer has not assigned any deliveries yet'
                                    : 'Accept deliveries to see them here')
                                : filter === 'available'
                                    ? (profile?.employer_name
                                        ? 'No orders assigned to you yet. Check back soon.'
                                        : 'Check back later for new deliveries')
                                    : dateFilter !== 'all'
                                        ? `No deliveries found for ${dateFilter === 'today' ? 'today' : dateFilter === 'week' ? 'this week' : 'this month'}`
                                        : 'Complete deliveries to build your history'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        backgroundColor: colors.primary,
        padding: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.white },

    filterContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: `${colors.primary}10`,
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: colors.primary,
    },
    filterTabText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    filterTabTextActive: { color: colors.white },

    // History Header Styles
    historyHeader: {
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 4,
    },
    statLabel: {
        fontSize: 11,
        color: colors.muted,
        marginTop: 2,
    },
    dateFilterRow: {
        flexDirection: 'row',
        gap: 6,
    },
    dateChip: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 20,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateChipActive: {
        backgroundColor: colors.primary,
    },
    dateChipText: {
        fontSize: 10.5,
        fontWeight: '600',
        color: colors.muted,
        textAlign: 'center',
    },
    dateChipTextActive: {
        color: colors.white,
    },

    listContent: { padding: 12, paddingBottom: 100 },

    deliveryCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    deliveryCardSuccess: {
        borderLeftWidth: 4,
        borderLeftColor: colors.success,
    },
    deliveryCardFailed: {
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    deliveryCardScheduled: {
        borderTopWidth: 0,
        overflow: 'hidden',
    },
    scheduledBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#5C6BC0', // Indigo color for scheduled
        marginHorizontal: -16,
        marginTop: -16,
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 6,
    },
    scheduledBannerText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderInfo: { flex: 1 },
    orderNumber: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    headerMetadata: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
    customerName: { fontSize: 13, color: colors.muted },
    distanceText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
    dateText: { fontSize: 11, color: colors.muted, marginLeft: 4 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        marginLeft: 8,
    },
    statusText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },

    cardBody: { marginBottom: 12 },
    locationRow: { flexDirection: 'row' },
    locationDot: { alignItems: 'center', width: 24, marginRight: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    line: { width: 2, height: 30, backgroundColor: colors.border },
    locationInfo: { flex: 1 },
    locationLabel: { fontSize: 11, color: colors.muted, marginBottom: 2 },
    locationText: { fontSize: 13, color: colors.text },
    spacer: { height: 12 },

    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
    contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    contactText: { fontSize: 13, color: colors.muted },
    earningsInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    websiteOrderTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0288D1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    websiteOrderText: { fontSize: 10, fontWeight: 'bold', color: colors.white },
    salesOrderTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#388E3C',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    salesOrderText: { fontSize: 10, fontWeight: 'bold', color: colors.white },
    codTag: {
        backgroundColor: `${colors.warning}20`,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    codTagText: { fontSize: 10, fontWeight: 'bold', color: colors.warning },
    marketplaceTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9C27B0', // Purple for marketplace
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    marketplaceText: { fontSize: 10, fontWeight: 'bold', color: colors.white },
    earningsText: { fontSize: 16, fontWeight: 'bold', color: colors.success },

    // Rating badge for history
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFB800',
    },

    // Loading more footer
    loadingMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    loadingMoreText: {
        fontSize: 13,
        color: colors.muted,
    },

    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16 },
    emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 8 },
});

export default DeliveriesScreen;
