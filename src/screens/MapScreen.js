import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from '../components/Map';

// Use Google Maps on Android (requires API key), Apple Maps on iOS (no key needed)
const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
import courierApi from '../services/courierApi';

const MapScreen = ({ navigation }) => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const mapRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [myLocation, setMyLocation] = useState(null);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const locationSubscription = useRef(null);

    useEffect(() => {
        initMap();
        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    const initMap = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Location permission is needed to show your position on the map.');
                setLoading(false);
                return;
            }

            // Get initial position
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setMyLocation(coords);

            // Watch position
            locationSubscription.current = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 15000 },
                (loc) => setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
            );

            await loadData();
        } catch (error) {
            console.error('Map init error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadData = async () => {
        const [profileRes, deliveriesRes] = await Promise.all([
            courierApi.getProfile(),
            courierApi.getActiveDeliveries(),
        ]);

        if (profileRes.success) {
            setIsOnline(!!profileRes.data?.is_online);
        }
        if (deliveriesRes.success) {
            setActiveDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : []);
        }
    };

    const centerOnMe = useCallback(() => {
        if (myLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                ...myLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }, 400);
        }
    }, [myLocation]);

    const openExternalNavigation = (delivery) => {
        const isPickupPending = ['pending', 'accepted'].includes(delivery.status);
        const lat = isPickupPending ? delivery.pickup_latitude : delivery.delivery_latitude;
        const lng = isPickupPending ? delivery.pickup_longitude : delivery.delivery_longitude;
        const label = isPickupPending ? 'Pickup Location' : delivery.delivery_address;

        if (!lat || !lng) {
            Alert.alert('No Location', 'This delivery does not have coordinates.');
            return;
        }

        const url = Platform.select({
            ios: `maps://app?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`,
        });

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
            }
        });
    };

    const getDeliveryColor = (status) => {
        const map = {
            pending: colors.warning,
            accepted: '#3B82F6',
            picked_up: '#8B5CF6',
            in_transit: colors.primary,
            arrived: colors.success,
        };
        return map[status] || colors.muted;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    // Default to Accra, Ghana if no location yet
    const initialRegion = myLocation
        ? { ...myLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        : { latitude: 5.6037, longitude: -0.1870, latitudeDelta: 0.1, longitudeDelta: 0.1 };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Live Map</Text>
                    <Text style={styles.headerSub}>
                        {activeDeliveries.length} active {activeDeliveries.length === 1 ? 'delivery' : 'deliveries'}
                    </Text>
                </View>
                <View style={[
                    styles.onlineBadge,
                    { backgroundColor: isOnline ? `${colors.success}20` : `${colors.muted}20` }
                ]}>
                    <View style={[styles.onlineDot, { backgroundColor: isOnline ? colors.success : colors.muted }]} />
                    <Text style={[styles.onlineText, { color: isOnline ? colors.success : colors.muted }]}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                </View>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    provider={MAP_PROVIDER}
                    initialRegion={initialRegion}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                    userInterfaceStyle={isDark ? 'dark' : 'light'}
                >
                    {/* Active delivery markers */}
                    {activeDeliveries.map((delivery) => {
                        const isPickup = ['pending', 'accepted'].includes(delivery.status);
                        const lat = isPickup ? delivery.pickup_latitude : delivery.delivery_latitude;
                        const lng = isPickup ? delivery.pickup_longitude : delivery.delivery_longitude;
                        if (!lat || !lng) return null;

                        return (
                            <Marker
                                key={delivery.id}
                                coordinate={{ latitude: parseFloat(lat), longitude: parseFloat(lng) }}
                                pinColor={getDeliveryColor(delivery.status)}
                                onPress={() => setSelectedDelivery(delivery)}
                                title={delivery.order_number || `Order #${String(delivery.id).slice(0, 8)}`}
                                description={isPickup ? delivery.pickup_address : delivery.delivery_address}
                            />
                        );
                    })}
                </MapView>

                {/* Center on me button */}
                <TouchableOpacity
                    style={styles.centerBtn}
                    onPress={centerOnMe}
                >
                    <Ionicons name="locate" size={22} color={colors.primary} />
                </TouchableOpacity>

                {/* Refresh button */}
                <TouchableOpacity
                    style={styles.refreshBtn}
                    onPress={loadData}
                >
                    <Ionicons name="refresh" size={22} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Selected delivery card */}
            {selectedDelivery && (
                <View style={styles.deliveryCard}>
                    <View style={styles.deliveryCardHeader}>
                        <Text style={styles.deliveryOrderNum}>
                            {selectedDelivery.order_number || `Order #${String(selectedDelivery.id).slice(0, 8)}`}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedDelivery(null)}>
                            <Ionicons name="close" size={20} color={colors.muted} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.deliveryAddress} numberOfLines={2}>
                        {['pending', 'accepted'].includes(selectedDelivery.status)
                            ? selectedDelivery.pickup_address
                            : selectedDelivery.delivery_address}
                    </Text>
                    <View style={styles.deliveryCardActions}>
                        <TouchableOpacity
                            style={[styles.navBtn, { backgroundColor: colors.primary }]}
                            onPress={() => openExternalNavigation(selectedDelivery)}
                        >
                            <Ionicons name="navigate" size={16} color={colors.white} />
                            <Text style={styles.navBtnText}>Navigate</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.detailBtn, { borderColor: colors.primary }]}
                            onPress={() => {
                                setSelectedDelivery(null);
                                navigation.navigate('DeliveryDetails', { deliveryId: selectedDelivery.id });
                            }}
                        >
                            <Text style={[styles.detailBtnText, { color: colors.primary }]}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        zIndex: 10,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    headerSub: { fontSize: 12, marginTop: 2, color: colors.muted },
    onlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    onlineText: { fontSize: 13, fontWeight: '600' },

    mapContainer: { flex: 1 },

    centerBtn: {
        position: 'absolute',
        right: 16,
        bottom: 120,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        backgroundColor: colors.card,
    },
    refreshBtn: {
        position: 'absolute',
        right: 16,
        bottom: 172,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        backgroundColor: colors.card,
    },

    deliveryCard: {
        padding: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: colors.border,
    },
    deliveryCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    deliveryOrderNum: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    deliveryAddress: { fontSize: 13, lineHeight: 18, marginBottom: 14, color: colors.muted },
    deliveryCardActions: { flexDirection: 'row', gap: 10 },
    navBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
    },
    navBtnText: { color: colors.white, fontWeight: '600', fontSize: 14 },
    detailBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    detailBtnText: { fontWeight: '600', fontSize: 14 },
});

export default MapScreen;
