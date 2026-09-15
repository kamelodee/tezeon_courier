import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from '../components/Map';

const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
import * as Location from 'expo-location';
import courierApi from '../services/courierApi';
import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.05;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const RoutePlanningScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const mapRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [deliveries, setDeliveries] = useState([]);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [selectedStop, setSelectedStop] = useState(null);
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [totalDistance, setTotalDistance] = useState(0);
    const [totalTime, setTotalTime] = useState(0);

    useEffect(() => {
        initializeRoute();
    }, []);

    const initializeRoute = async () => {
        try {
            // Get current location
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                setCurrentLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });
            }

            // Get active deliveries
            const response = await courierApi.getActiveDeliveries();
            if (response.success && Array.isArray(response.data)) {
                const activeDeliveries = response.data.filter(d =>
                    ['accepted', 'picked_up', 'in_transit'].includes(d.status)
                );

                // Sort deliveries by status (pickup first, then delivery)
                const sortedDeliveries = sortDeliveriesByRoute(activeDeliveries);
                setDeliveries(sortedDeliveries);

                // Calculate route
                if (sortedDeliveries.length > 0) {
                    calculateRoute(sortedDeliveries);
                }
            }
        } catch (error) {
            console.error('Route init error:', error);
            Alert.alert('Error', 'Failed to load route data');
        } finally {
            setLoading(false);
        }
    };

    const sortDeliveriesByRoute = (deliveries) => {
        // Create stops array with pickup and delivery points
        const stops = [];

        deliveries.forEach((delivery, index) => {
            // Add pickup stop if not yet picked up
            if (['accepted', 'pending'].includes(delivery.status)) {
                stops.push({
                    ...delivery,
                    stopType: 'pickup',
                    stopIndex: stops.length,
                    latitude: parseFloat(delivery.pickup_latitude),
                    longitude: parseFloat(delivery.pickup_longitude),
                    address: delivery.pickup_address || 'Pickup Location',
                    name: delivery.seller_name || 'Seller',
                });
            }

            // Add delivery stop
            stops.push({
                ...delivery,
                stopType: 'delivery',
                stopIndex: stops.length,
                latitude: parseFloat(delivery.delivery_latitude),
                longitude: parseFloat(delivery.delivery_longitude),
                address: delivery.delivery_address,
                name: delivery.delivery_contact_name || 'Customer',
            });
        });

        return stops;
    };

    const calculateRoute = (stops) => {
        // Simple route - connect all points in order
        const coordinates = [];
        let distance = 0;

        // Add current location as start if available
        if (currentLocation) {
            coordinates.push(currentLocation);
        }

        // Add all stops
        stops.forEach((stop, index) => {
            if (stop.latitude && stop.longitude) {
                coordinates.push({
                    latitude: stop.latitude,
                    longitude: stop.longitude,
                });

                // Calculate distance from previous point
                if (index > 0 || currentLocation) {
                    const prevPoint = index === 0 ? currentLocation : {
                        latitude: stops[index - 1].latitude,
                        longitude: stops[index - 1].longitude,
                    };
                    if (prevPoint) {
                        distance += calculateDistance(
                            prevPoint.latitude,
                            prevPoint.longitude,
                            stop.latitude,
                            stop.longitude
                        );
                    }
                }
            }
        });

        setRouteCoordinates(coordinates);
        setTotalDistance(distance);
        setTotalTime(Math.round(distance * 3)); // Rough estimate: 3 min per km

        // Fit map to show all markers
        if (mapRef.current && coordinates.length > 0) {
            setTimeout(() => {
                mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
                    animated: true,
                });
            }, 500);
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const openNavigation = (stop) => {
        if (!stop.latitude || !stop.longitude) {
            Alert.alert('Error', 'Location coordinates not available');
            return;
        }

        const lat = stop.latitude;
        const lng = stop.longitude;
        const label = encodeURIComponent(stop.address);

        Alert.alert(
            '🗺️ Navigate to Stop',
            stop.address,
            [
                {
                    text: 'Google Maps',
                    onPress: () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`)
                },
                {
                    text: 'Waze',
                    onPress: () => Linking.openURL(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`)
                },
                {
                    text: 'Default Maps',
                    onPress: () => {
                        const url = Platform.select({
                            ios: `maps:0,0?q=${label}@${lat},${lng}`,
                            android: `geo:0,0?q=${lat},${lng}(${label})`
                        });
                        Linking.openURL(url);
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const navigateFullRoute = () => {
        if (deliveries.length === 0) {
            Alert.alert('No Stops', 'No active deliveries to navigate');
            return;
        }

        // Build waypoints for Google Maps
        const waypoints = deliveries
            .filter(d => d.latitude && d.longitude)
            .map(d => `${d.latitude},${d.longitude}`)
            .join('|');

        const firstStop = deliveries[0];
        const lastStop = deliveries[deliveries.length - 1];

        if (deliveries.length === 1) {
            openNavigation(firstStop);
        } else {
            // Multi-stop navigation
            const origin = currentLocation
                ? `${currentLocation.latitude},${currentLocation.longitude}`
                : `${firstStop.latitude},${firstStop.longitude}`;
            const destination = `${lastStop.latitude},${lastStop.longitude}`;
            const middleWaypoints = deliveries
                .slice(0, -1)
                .filter(d => d.latitude && d.longitude)
                .map(d => `${d.latitude},${d.longitude}`)
                .join('|');

            const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${middleWaypoints}&travelmode=driving`;
            Linking.openURL(url);
        }
    };

    const recenterMap = () => {
        if (mapRef.current && routeCoordinates.length > 0) {
            mapRef.current.fitToCoordinates(routeCoordinates, {
                edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
                animated: true,
            });
        } else if (mapRef.current && currentLocation) {
            mapRef.current.animateToRegion({
                ...currentLocation,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            });
        }
    };

    const StopCard = ({ stop, index, isSelected, onPress }) => {
        const isPickup = stop.stopType === 'pickup';

        return (
            <TouchableOpacity
                style={[
                    styles.stopCard,
                    isSelected && styles.stopCardSelected,
                    isPickup && styles.stopCardPickup
                ]}
                onPress={onPress}
            >
                <View style={[
                    styles.stopNumber,
                    { backgroundColor: isPickup ? colors.success : colors.primary }
                ]}>
                    <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                    <View style={styles.stopTypeRow}>
                        <View style={[
                            styles.stopTypeBadge,
                            { backgroundColor: isPickup ? `${colors.success}15` : `${colors.primary}15` }
                        ]}>
                            <Ionicons
                                name={isPickup ? 'cube' : 'location'}
                                size={12}
                                color={isPickup ? colors.success : colors.primary}
                            />
                            <Text style={[
                                styles.stopTypeText,
                                { color: isPickup ? colors.success : colors.primary }
                            ]}>
                                {isPickup ? 'PICKUP' : 'DELIVERY'}
                            </Text>
                        </View>
                        <Text style={styles.stopEarning}>₵{parseFloat(stop.courier_earning || 0).toFixed(2)}</Text>
                    </View>
                    <Text style={styles.stopName} numberOfLines={1}>{stop.name}</Text>
                    <Text style={styles.stopAddress} numberOfLines={2}>{stop.address}</Text>
                </View>
                <TouchableOpacity
                    style={styles.navigateButton}
                    onPress={() => openNavigation(stop)}
                >
                    <Ionicons name="navigate" size={20} color={colors.white} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Planning your route...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Route Planning</Text>
                    <Text style={styles.headerSubtitle}>
                        {deliveries.length} stops • {totalDistance.toFixed(1)} km
                    </Text>
                </View>
                <TouchableOpacity onPress={initializeRoute} style={styles.refreshButton}>
                    <Ionicons name="refresh" size={22} color={colors.white} />
                </TouchableOpacity>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={MAP_PROVIDER}
                    initialRegion={currentLocation ? {
                        ...currentLocation,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    } : {
                        latitude: 5.6037,
                        longitude: -0.1870,
                        latitudeDelta: LATITUDE_DELTA,
                        longitudeDelta: LONGITUDE_DELTA,
                    }}
                    showsUserLocation
                    showsMyLocationButton={false}
                >
                    {/* Route line */}
                    {routeCoordinates.length > 1 && (
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor={colors.primary}
                            strokeWidth={4}
                            lineDashPattern={[1]}
                        />
                    )}

                    {/* Stop markers */}
                    {deliveries.map((stop, index) => (
                        <Marker
                            key={`${stop.id}-${stop.stopType}`}
                            coordinate={{
                                latitude: stop.latitude,
                                longitude: stop.longitude,
                            }}
                            onPress={() => setSelectedStop(stop)}
                        >
                            <View style={[
                                styles.markerContainer,
                                { backgroundColor: stop.stopType === 'pickup' ? colors.success : colors.primary }
                            ]}>
                                <Text style={styles.markerText}>{index + 1}</Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* Map controls */}
                <View style={styles.mapControls}>
                    <TouchableOpacity style={styles.mapControlButton} onPress={recenterMap}>
                        <Ionicons name="locate" size={22} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Route summary overlay */}
                <View style={styles.routeSummary}>
                    <View style={styles.summaryItem}>
                        <Ionicons name="flag" size={18} color={colors.primary} />
                        <Text style={styles.summaryValue}>{deliveries.length}</Text>
                        <Text style={styles.summaryLabel}>Stops</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Ionicons name="navigate" size={18} color={colors.success} />
                        <Text style={styles.summaryValue}>{totalDistance.toFixed(1)}</Text>
                        <Text style={styles.summaryLabel}>km</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Ionicons name="time" size={18} color={colors.warning} />
                        <Text style={styles.summaryValue}>{totalTime}</Text>
                        <Text style={styles.summaryLabel}>min</Text>
                    </View>
                </View>
            </View>

            {/* Stops List */}
            <View style={styles.stopsContainer}>
                <View style={styles.stopsHeader}>
                    <Text style={styles.stopsTitle}>Your Route</Text>
                    <TouchableOpacity style={styles.startRouteButton} onPress={navigateFullRoute}>
                        <Ionicons name="navigate" size={16} color={colors.white} />
                        <Text style={styles.startRouteText}>Start Navigation</Text>
                    </TouchableOpacity>
                </View>

                {deliveries.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="map-outline" size={48} color={colors.muted} />
                        <Text style={styles.emptyText}>No active deliveries</Text>
                        <Text style={styles.emptySubtext}>Accept some deliveries to plan your route</Text>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.stopsList}
                        showsVerticalScrollIndicator={false}
                    >
                        {deliveries.map((stop, index) => (
                            <StopCard
                                key={`${stop.id}-${stop.stopType}`}
                                stop={stop}
                                index={index}
                                isSelected={selectedStop?.id === stop.id && selectedStop?.stopType === stop.stopType}
                                onPress={() => {
                                    setSelectedStop(stop);
                                    if (mapRef.current) {
                                        mapRef.current.animateToRegion({
                                            latitude: stop.latitude,
                                            longitude: stop.longitude,
                                            latitudeDelta: 0.01,
                                            longitudeDelta: 0.01,
                                        });
                                    }
                                }}
                            />
                        ))}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                )}
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.muted,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    refreshButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Map
    mapContainer: {
        height: height * 0.35,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    mapControls: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    mapControlButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },

    // Route summary
    routeSummary: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    summaryItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    summaryLabel: {
        fontSize: 12,
        color: colors.muted,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: colors.border,
    },

    // Markers
    markerContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.white,
    },
    markerText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Stops list
    stopsContainer: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -16,
        paddingTop: 16,
    },
    stopsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    stopsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    startRouteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    startRouteText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.white,
    },
    stopsList: {
        flex: 1,
        paddingHorizontal: 16,
    },

    // Stop card
    stopCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    stopCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },
    stopCardPickup: {
        backgroundColor: `${colors.success}08`,
    },
    stopNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stopNumberText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    stopInfo: {
        flex: 1,
    },
    stopTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    stopTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    stopTypeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    stopEarning: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.success,
    },
    stopName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    stopAddress: {
        fontSize: 12,
        color: colors.muted,
        lineHeight: 16,
    },
    navigateButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },

    // Empty state
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.muted,
        marginTop: 4,
        textAlign: 'center',
    },
});

export default RoutePlanningScreen;
