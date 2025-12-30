import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const DeliveriesScreen = ({ navigation }) => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('active');

    useEffect(() => {
        loadDeliveries();
    }, [filter]);

    const loadDeliveries = async () => {
        try {
            let response;
            if (filter === 'active') {
                response = await courierApi.getActiveDeliveries();
            } else if (filter === 'available') {
                response = await courierApi.getAvailableDeliveries();
            } else {
                response = await courierApi.getDeliveryHistory();
            }

            if (response.success) {
                setDeliveries(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error('Load deliveries error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadDeliveries();
    }, [filter]);

    const getStatusColor = (status) => {
        const colors = {
            pending: COLORS.warning,
            accepted: COLORS.primary,
            picked_up: COLORS.primaryDark,
            in_transit: COLORS.secondary,
            arrived: COLORS.success,
            delivered: COLORS.success,
            failed: COLORS.error,
            cancelled: COLORS.muted
        };
        return colors[status] || COLORS.muted;
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
            cancelled: 'ban-outline'
        };
        return icons[status] || 'help-circle-outline';
    };

    const renderDelivery = ({ item }) => (
        <TouchableOpacity
            style={styles.deliveryCard}
            onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{item.order_number || `Order #${item.id?.slice(0, 8)}`}</Text>
                    <Text style={styles.customerName}>{item.customer_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Ionicons name={getStatusIcon(item.status)} size={12} color="#fff" />
                    <Text style={styles.statusText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.cardBody}>
                <View style={styles.locationRow}>
                    <View style={styles.locationDot}>
                        <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                        <View style={styles.line} />
                        <View style={[styles.dot, { backgroundColor: COLORS.error }]} />
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
                <View style={styles.contactInfo}>
                    <Ionicons name="call-outline" size={14} color={COLORS.muted} />
                    <Text style={styles.contactText}>{item.delivery_contact_phone}</Text>
                </View>
                <View style={styles.earningsInfo}>
                    {item.is_cash_on_delivery && (
                        <View style={styles.codTag}>
                            <Text style={styles.codTagText}>COD</Text>
                        </View>
                    )}
                    <Text style={styles.earningsText}>₵{parseFloat(item.courier_earning || 0).toFixed(2)}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const FilterTab = ({ status, label, icon }) => (
        <TouchableOpacity
            style={[styles.filterTab, filter === status && styles.filterTabActive]}
            onPress={() => setFilter(status)}
        >
            <Ionicons
                name={icon}
                size={18}
                color={filter === status ? COLORS.white : COLORS.primary}
            />
            <Text style={[styles.filterTabText, filter === status && styles.filterTabTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

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
                <Text style={styles.headerTitle}>Deliveries</Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <FilterTab status="active" label="Active" icon="bicycle-outline" />
                <FilterTab status="available" label="Available" icon="search-outline" />
                <FilterTab status="history" label="History" icon="time-outline" />
            </View>

            {/* Deliveries List */}
            <FlatList
                data={deliveries}
                renderItem={renderDelivery}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons
                            name={filter === 'available' ? 'search-outline' : 'cube-outline'}
                            size={64}
                            color={COLORS.muted}
                        />
                        <Text style={styles.emptyTitle}>
                            {filter === 'active' ? 'No Active Deliveries' :
                                filter === 'available' ? 'No Available Deliveries' :
                                    'No Delivery History'}
                        </Text>
                        <Text style={styles.emptyText}>
                            {filter === 'active' ? 'Accept deliveries to see them here' :
                                filter === 'available' ? 'Check back later for new deliveries' :
                                    'Complete deliveries to build your history'}
                        </Text>
                    </View>
                }
            />
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

    filterContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: COLORS.white,
        gap: 8,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: `${COLORS.primary}10`,
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: COLORS.primary,
    },
    filterTabText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
    filterTabTextActive: { color: COLORS.white },

    listContent: { padding: 12, paddingBottom: 100 },

    deliveryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderInfo: {},
    orderNumber: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
    customerName: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusText: { color: COLORS.white, fontSize: 10, fontWeight: 'bold' },

    cardBody: { marginBottom: 12 },
    locationRow: { flexDirection: 'row' },
    locationDot: { alignItems: 'center', width: 24, marginRight: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    line: { width: 2, height: 30, backgroundColor: COLORS.border },
    locationInfo: { flex: 1 },
    locationLabel: { fontSize: 11, color: COLORS.muted, marginBottom: 2 },
    locationText: { fontSize: 13, color: COLORS.text },
    spacer: { height: 12 },

    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    contactText: { fontSize: 13, color: COLORS.muted },
    earningsInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    codTag: {
        backgroundColor: `${COLORS.warning}20`,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    codTagText: { fontSize: 10, fontWeight: 'bold', color: COLORS.warning },
    earningsText: { fontSize: 16, fontWeight: 'bold', color: COLORS.success },

    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 8 },
});

export default DeliveriesScreen;
