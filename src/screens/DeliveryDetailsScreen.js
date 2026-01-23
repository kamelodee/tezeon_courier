import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    TextInput,
    Modal,
    Image,
    Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { hp } from '../utils/responsive';
import courierApi from '../services/courierApi';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '../components/Map';
import * as Location from 'expo-location';
import SignatureScreen from 'react-native-signature-canvas';
import * as FileSystem from 'expo-file-system';

const DeliveryDetailsScreen = ({ route, navigation }) => {
    const { deliveryId } = route.params;
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showFailModal, setShowFailModal] = useState(false);
    const [recipientName, setRecipientName] = useState('');
    const [deliveryCode, setDeliveryCode] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [failureReason, setFailureReason] = useState('');
    const [deliveryPhoto, setDeliveryPhoto] = useState(null);
    const [recipientSignature, setRecipientSignature] = useState(null);
    const [courierLocation, setCourierLocation] = useState(null);

    useEffect(() => {
        loadDeliveryDetails();
        loadCourierLocation();
    }, [deliveryId]);

    const loadCourierLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            let location = await Location.getCurrentPositionAsync({});
            setCourierLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        } catch (error) {
            console.log('Error getting location:', error);
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

    const loadDeliveryDetails = async () => {
        try {
            const response = await courierApi.getDeliveryDetails(deliveryId);
            if (response.success) {
                setDelivery(response.data);
            }
        } catch (error) {
            console.error('Load delivery details error:', error);
            Alert.alert('Error', 'Failed to load delivery details');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action) => {
        setActionLoading(true);
        try {
            let response;
            switch (action) {
                case 'accept':
                    response = await courierApi.acceptDelivery(deliveryId);
                    break;
                case 'pickup':
                    response = await courierApi.pickupDelivery(deliveryId);
                    break;
                case 'transit':
                    response = await courierApi.startTransit(deliveryId);
                    break;
                case 'arrive':
                    response = await courierApi.arriveAtDestination(deliveryId);
                    break;
                default:
                    return;
            }

            if (response.success) {
                loadDeliveryDetails();
                Alert.alert('Success', 'Status updated successfully');
            } else {
                Alert.alert('Error', response.data?.error || 'Failed to update status');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSignature = (signature) => {
        setRecipientSignature(signature);
    };

    const handleComplete = async () => {
        if (!recipientName) {
            Alert.alert('Error', 'Please enter recipient name');
            return;
        }

        // Keystone: Validate OTP
        if (!deliveryCode || deliveryCode.length !== 4) {
            Alert.alert('Invalid Code', 'Please enter the 4-digit Delivery Code provided by the customer.');
            return;
        }

        if (!recipientSignature && !deliveryPhoto) {
            Alert.alert('Proof Required', 'Please provide either a signature or a photo proof.');
            return;
        }

        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('recipient_name', recipientName);
            formData.append('delivery_code', deliveryCode); // Send OTP
            formData.append('notes', deliveryNotes);

            if (deliveryPhoto) {
                formData.append('delivery_photo', {
                    uri: deliveryPhoto,
                    type: 'image/jpeg',
                    name: 'delivery_proof.jpg'
                });
            }

            if (recipientSignature) {
                // Remove the 'data:image/png;base64,' part
                const base64Code = recipientSignature.split(',')[1];
                const filename = FileSystem.cacheDirectory + 'signature.png';
                await FileSystem.writeAsStringAsync(filename, base64Code, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                formData.append('recipient_signature', {
                    uri: filename,
                    type: 'image/png',
                    name: 'signature.png'
                });
            }

            const response = await courierApi.completeDelivery(deliveryId, formData);
            if (response.success) {
                setShowCompleteModal(false);
                Alert.alert('Success', 'Delivery completed!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.data?.error || 'Failed to complete delivery');
            }
        } catch (error) {
            console.error('Complete delivery error:', error);
            Alert.alert('Error', 'An error occurred during completion');
        } finally {
            setActionLoading(false);
        }
    };

    const handleFail = async () => {
        if (!failureReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for failure');
            return;
        }

        setActionLoading(true);
        try {
            const response = await courierApi.failDelivery(deliveryId, failureReason);
            if (response.success) {
                setShowFailModal(false);
                Alert.alert('Marked as Failed', 'Delivery has been marked as failed', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.data?.error || 'Failed to update status');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setDeliveryPhoto(result.assets[0].uri);
        }
    };

    const chatWithCustomer = () => {
        if (delivery?.delivery_contact_phone) {
            const phone = delivery.delivery_contact_phone.replace(/\+/g, '');
            const url = `whatsapp://send?phone=${phone}`;
            Linking.canOpenURL(url).then(supported => {
                if (supported) {
                    Linking.openURL(url);
                } else {
                    Alert.alert('Error', 'WhatsApp is not installed');
                }
            });
        }
    };

    const callCustomer = () => {
        if (delivery?.delivery_contact_phone) {
            Linking.openURL(`tel:${delivery.delivery_contact_phone}`);
        }
    };

    const openInMaps = (lat, lng, address) => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${lat},${lng}`;
        const label = encodeURIComponent(address);

        let url = '';
        if (lat && lng) {
            url = Platform.select({
                ios: `${scheme}${label}@${latLng}`,
                android: `${scheme}${latLng}(${label})`
            });
            // Fallback for Google Maps if preferred
            const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

            Alert.alert(
                'Navigate',
                'Choose your maps application',
                [
                    { text: 'Default Maps', onPress: () => Linking.openURL(url) },
                    { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl) },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } else if (address) {
            url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            Linking.openURL(url);
        }
    };

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

    const getNextAction = () => {
        switch (delivery?.status) {
            case 'pending':
                return { action: 'accept', label: 'Accept Delivery', icon: 'checkmark-circle' };
            case 'accepted':
                return { action: 'pickup', label: 'Mark as Picked Up', icon: 'cube' };
            case 'picked_up':
                return { action: 'transit', label: 'Start Transit', icon: 'bicycle' };
            case 'in_transit':
                return { action: 'arrive', label: 'Arrived at Location', icon: 'location' };
            case 'arrived':
                return { action: 'complete', label: 'Complete Delivery', icon: 'checkmark-done' };
            default:
                return null;
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

    const nextAction = getNextAction();
    const insets = useSafeAreaInsets();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Delivery Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* MarketPlace Offered Price Banner */}
                {delivery?.status === 'pending' && delivery?.is_marketplace && (
                    <View style={styles.marketplaceBanner}>
                        <View style={styles.priceContainer}>
                            <Text style={styles.priceLabel}>Offered Earnings</Text>
                            <Text style={styles.priceValue}>₵{parseFloat(delivery.offered_price || 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.marketBadge}>
                            <Ionicons name="globe" size={16} color={COLORS.white} />
                            <Text style={styles.marketText}>MARKETPLACE JOB</Text>
                        </View>
                    </View>
                )}

                {/* Scheduled Delivery Banner */}
                {delivery?.is_scheduled && delivery?.scheduled_pickup_time && (
                    <View style={styles.scheduledDeliveryBanner}>
                        <View style={styles.scheduledIconContainer}>
                            <Ionicons name="calendar" size={24} color={COLORS.white} />
                        </View>
                        <View style={styles.scheduledContent}>
                            <Text style={styles.scheduledLabel}>Scheduled Pickup</Text>
                            <Text style={styles.scheduledTime}>
                                {new Date(delivery.scheduled_pickup_time).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                })} at {new Date(delivery.scheduled_pickup_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                        <Ionicons name="time-outline" size={20} color={COLORS.white} style={{ opacity: 0.7 }} />
                    </View>
                )}

                <View style={styles.statusCard}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery?.status) }]}>
                        <Text style={styles.statusText}>{delivery?.status?.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.orderNumber}>{delivery?.order_number}</Text>
                    <Text style={styles.earning}>Earn: ₵{parseFloat(delivery?.courier_earning || 0).toFixed(2)}</Text>
                </View>

                {/* Route Summary & Map */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ROUTE SUMMARY</Text>
                    <View style={styles.routeSummaryCard}>
                        <View style={styles.summaryItem}>
                            <Ionicons name="bicycle" size={20} color={COLORS.primary} />
                            <View style={styles.summaryContent}>
                                <Text style={styles.summaryLabel}>To Pickup</Text>
                                <Text style={styles.summaryValue}>
                                    {courierLocation && delivery?.pickup_latitude ?
                                        `${calculateDistance(courierLocation.latitude, courierLocation.longitude, delivery.pickup_latitude, delivery.pickup_longitude)} km` :
                                        '--'
                                    }
                                </Text>
                            </View>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Ionicons name="location" size={20} color={COLORS.error} />
                            <View style={styles.summaryContent}>
                                <Text style={styles.summaryLabel}>Total Delivery</Text>
                                <Text style={styles.summaryValue}>
                                    {delivery?.pickup_latitude && delivery?.delivery_latitude ?
                                        `${calculateDistance(delivery.pickup_latitude, delivery.pickup_longitude, delivery.delivery_latitude, delivery.delivery_longitude)} km` :
                                        '--'
                                    }
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.mapWrapper}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={styles.map}
                            initialRegion={{
                                latitude: parseFloat(delivery?.pickup_latitude || 0),
                                longitude: parseFloat(delivery?.pickup_longitude || 0),
                                latitudeDelta: 0.05,
                                longitudeDelta: 0.05,
                            }}
                        >
                            {courierLocation && (
                                <Marker
                                    coordinate={courierLocation}
                                    title="You"
                                    pinColor={COLORS.secondary}
                                />
                            )}
                            {delivery?.pickup_latitude && (
                                <Marker
                                    coordinate={{
                                        latitude: parseFloat(delivery.pickup_latitude),
                                        longitude: parseFloat(delivery.pickup_longitude)
                                    }}
                                    title="Pickup"
                                    pinColor={COLORS.primary}
                                />
                            )}
                            {delivery?.delivery_latitude && (
                                <Marker
                                    coordinate={{
                                        latitude: parseFloat(delivery.delivery_latitude),
                                        longitude: parseFloat(delivery.delivery_longitude)
                                    }}
                                    title="Delivery"
                                    pinColor={COLORS.error}
                                />
                            )}
                            {delivery?.pickup_latitude && delivery?.delivery_latitude && (
                                <Polyline
                                    coordinates={[
                                        { latitude: parseFloat(delivery.pickup_latitude), longitude: parseFloat(delivery.pickup_longitude) },
                                        { latitude: parseFloat(delivery.delivery_latitude), longitude: parseFloat(delivery.delivery_longitude) }
                                    ]}
                                    strokeColor={COLORS.primary}
                                    strokeWidth={3}
                                />
                            )}
                        </MapView>
                    </View>
                </View>

                {/* Customer Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CUSTOMER</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person" size={20} color={COLORS.primary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Name</Text>
                                <Text style={styles.infoValue}>{delivery?.delivery_contact_name}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.infoRow} onPress={callCustomer}>
                            <Ionicons name="call" size={20} color={COLORS.success} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Phone</Text>
                                <Text style={[styles.infoValue, { color: COLORS.primary }]}>
                                    {delivery?.delivery_contact_phone}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.infoRow} onPress={chatWithCustomer}>
                            <Ionicons name="logo-whatsapp" size={20} color={COLORS.success} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Chat (WhatsApp)</Text>
                                <Text style={[styles.infoValue, { color: COLORS.primary }]}>
                                    {delivery?.delivery_contact_phone}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pickup Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PICKUP ADDRESS</Text>
                    <TouchableOpacity
                        style={styles.addressCard}
                        onPress={() => openInMaps(delivery?.pickup_latitude, delivery?.pickup_longitude, delivery?.pickup_address)}
                    >
                        <View style={styles.addressContent}>
                            <Ionicons name="business" size={24} color={COLORS.primary} />
                            <Text style={styles.addressText}>{delivery?.pickup_address || 'Seller Location'}</Text>
                        </View>
                        <View style={styles.navigateButton}>
                            <Ionicons name="navigate" size={20} color={COLORS.white} />
                            <Text style={styles.navigateText}>Navigate</Text>
                        </View>
                    </TouchableOpacity>
                    {delivery?.pickup_contact_phone ? (
                        <TouchableOpacity style={styles.pickupContact} onPress={() => Linking.openURL(`tel:${delivery.pickup_contact_phone}`)}>
                            <Ionicons name="call" size={16} color={COLORS.success} />
                            <Text style={styles.pickupContactText}>Call Seller: {delivery.pickup_contact_phone}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Delivery Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
                    <TouchableOpacity
                        style={styles.addressCard}
                        onPress={() => openInMaps(delivery?.delivery_latitude, delivery?.delivery_longitude, delivery?.delivery_address)}
                    >
                        <View style={styles.addressContent}>
                            <Ionicons name="location" size={24} color={COLORS.error} />
                            <Text style={styles.addressText}>{delivery?.delivery_address}</Text>
                        </View>
                        <View style={styles.navigateButton}>
                            <Ionicons name="navigate" size={20} color={COLORS.white} />
                            <Text style={styles.navigateText}>Navigate</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Instructions */}
                {delivery?.delivery_instructions && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>INSTRUCTIONS</Text>
                        <View style={styles.instructionsCard}>
                            <Ionicons name="information-circle" size={20} color={COLORS.warning} />
                            <Text style={styles.instructionsText}>{delivery?.delivery_instructions}</Text>
                        </View>
                    </View>
                )}

                {/* Order Items */}
                {delivery?.items && delivery.items.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ORDER ITEMS</Text>
                        <View style={styles.itemsCard}>
                            {delivery.items.map((item, index) => (
                                <View key={index} style={styles.itemRow}>
                                    <Text style={styles.itemName}>{item.product_name}</Text>
                                    <Text style={styles.itemQty}>x{item.quantity}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Payment Info */}
                {delivery?.is_cash_on_delivery && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>PAYMENT</Text>
                        <View style={styles.codCard}>
                            <Ionicons name="cash" size={24} color={COLORS.warning} />
                            <View style={styles.codContent}>
                                <Text style={styles.codLabel}>Cash on Delivery</Text>
                                <Text style={styles.codAmount}>₵{parseFloat(delivery.cod_amount || 0).toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Status Timeline */}
                {delivery?.status_logs && delivery.status_logs.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>STATUS HISTORY</Text>
                        <View style={styles.timelineCard}>
                            {delivery.status_logs.map((log, index) => (
                                <View key={index} style={styles.timelineItem}>
                                    <View style={styles.timelineDot} />
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineStatus}>
                                            {log.status.replace('_', ' ').toUpperCase()}
                                        </Text>
                                        <Text style={styles.timelineTime}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Action Buttons */}
            {nextAction && (
                <View style={[styles.actionContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    {delivery?.status !== 'pending' && (
                        <TouchableOpacity
                            style={styles.failButton}
                            onPress={() => navigation.navigate('SupportTicket', {
                                deliveryId: delivery.id,
                                reason: 'vehicle_breakdown' // Default or based on context
                            })}
                        >
                            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                            <Text style={styles.failButtonText}>Issues</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.actionButton, actionLoading && styles.actionButtonDisabled]}
                        onPress={() => {
                            if (nextAction.action === 'complete') {
                                setShowCompleteModal(true);
                            } else {
                                handleAction(nextAction.action);
                            }
                        }}
                        disabled={!!actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name={nextAction.icon} size={20} color="#fff" />
                                <Text style={styles.actionButtonText}>{nextAction.label}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Complete Modal */}
            <Modal visible={!!showCompleteModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Complete Delivery</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Recipient Name"
                            value={recipientName}
                            onChangeText={setRecipientName}
                        />

                        {/* Keystone: OTP Entry */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4, marginLeft: 4 }}>Ask Customer for Delivery Code</Text>
                            <TextInput
                                style={[styles.modalInput, { fontSize: 24, textAlign: 'center', letterSpacing: 8, fontWeight: 'bold', borderColor: COLORS.primary }]}
                                placeholder="0 0 0 0"
                                value={deliveryCode}
                                onChangeText={setDeliveryCode}
                                keyboardType="number-pad"
                                maxLength={4}
                            />
                        </View>

                        <TextInput
                            style={[styles.modalInput, { height: 60 }]}
                            placeholder="Delivery Notes (optional)"
                            value={deliveryNotes}
                            onChangeText={setDeliveryNotes}
                            multiline
                        />

                        <View style={styles.proofContainer}>
                            <TouchableOpacity
                                style={[styles.proofToggle, !recipientSignature && styles.proofToggleActive]}
                                onPress={() => setRecipientSignature(null)}
                            >
                                <Ionicons name="camera" size={20} color={!recipientSignature ? COLORS.white : COLORS.muted} />
                                <Text style={[styles.proofToggleText, !recipientSignature && styles.proofToggleTextActive]}>Photo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.proofToggle, !!recipientSignature && styles.proofToggleActive]}
                                onPress={() => { }} // Controlled by canvas
                            >
                                <Ionicons name="pencil" size={20} color={!!recipientSignature ? COLORS.white : COLORS.muted} />
                                <Text style={[styles.proofToggleText, !!recipientSignature && styles.proofToggleTextActive]}>Signature</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.proofContent}>
                            {recipientSignature ? (
                                <View style={styles.signaturePreviewContainer}>
                                    <Image source={{ uri: recipientSignature }} style={styles.signaturePreview} resizeMode="contain" />
                                    <TouchableOpacity style={styles.clearSignature} onPress={() => setRecipientSignature(null)}>
                                        <Text style={styles.clearSignatureText}>Clear Signature</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.signatureWrapper}>
                                    <SignatureScreen
                                        onOK={handleSignature}
                                        onEmpty={() => console.log('Empty')}
                                        descriptionText="Sign Here"
                                        clearText="Clear"
                                        confirmText="Save"
                                        webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
                                        autoSize={true}
                                    />
                                </View>
                            )}

                            <TouchableOpacity style={styles.photoButtonSmall} onPress={pickImage}>
                                {deliveryPhoto ? (
                                    <Image source={{ uri: deliveryPhoto }} style={styles.photoPreviewSmall} />
                                ) : (
                                    <>
                                        <Ionicons name="camera" size={24} color={COLORS.muted} />
                                        <Text style={styles.photoButtonTextSmall}>Add Photo Proof (Optional)</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setShowCompleteModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirm, !!actionLoading && { opacity: 0.7 }]}
                                onPress={handleComplete}
                                disabled={!!actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Complete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Fail Modal */}
            <Modal visible={!!showFailModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Mark as Failed</Text>

                        <TextInput
                            style={[styles.modalInput, { height: 100 }]}
                            placeholder="Reason for failure..."
                            value={failureReason}
                            onChangeText={setFailureReason}
                            multiline
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setShowFailModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirm, { backgroundColor: COLORS.error }, !!actionLoading && { opacity: 0.7 }]}
                                onPress={handleFail}
                                disabled={!!actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalConfirmText}>Mark Failed</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        backgroundColor: COLORS.primary,
        padding: 16,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },

    content: { flex: 1 },

    statusCard: {
        backgroundColor: COLORS.white,
        padding: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    statusText: { color: COLORS.white, fontWeight: 'bold', fontSize: 12 },
    orderNumber: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 12 },
    earning: { fontSize: 24, fontWeight: 'bold', color: COLORS.success, marginTop: 8 },

    marketplaceBanner: {
        backgroundColor: '#4A148C',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 4,
        borderBottomColor: '#7B1FA2'
    },
    priceContainer: {},
    priceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
    priceValue: { fontSize: 32, fontWeight: 'bold', color: COLORS.white, marginTop: 4 },
    marketBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
    marketText: { color: COLORS.white, fontSize: 11, fontWeight: 'bold' },

    // Scheduled Delivery Banner Styles
    scheduledDeliveryBanner: {
        backgroundColor: '#5C6BC0', // Indigo
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: '#3F51B5',
        gap: 12,
    },
    scheduledIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scheduledContent: {
        flex: 1,
    },
    scheduledLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scheduledTime: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
        marginTop: 2,
    },

    routeSummaryCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryContent: {},
    summaryLabel: { fontSize: 10, color: COLORS.muted, textTransform: 'uppercase' },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginTop: 2 },
    summaryDivider: { width: 1, height: 30, backgroundColor: COLORS.border, marginHorizontal: 10 },
    mapWrapper: { height: hp('30%'), borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.border },
    map: { ...StyleSheet.absoluteFillObject },

    section: { padding: 16, paddingBottom: 0 },
    sectionTitle: { fontSize: 11, fontWeight: '600', color: COLORS.muted, marginBottom: 8, letterSpacing: 0.5 },

    infoCard: { backgroundColor: COLORS.white, borderRadius: 12, overflow: 'hidden' },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    infoContent: { flex: 1, marginLeft: 12 },
    infoLabel: { fontSize: 12, color: COLORS.muted },
    infoValue: { fontSize: 15, color: COLORS.text, fontWeight: '500', marginTop: 2 },

    addressCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
    addressContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    addressText: { flex: 1, fontSize: 14, color: COLORS.text, marginLeft: 12, lineHeight: 20 },
    navigateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8, gap: 8 },
    navigateText: { color: COLORS.white, fontWeight: '600' },
    pickupContact: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: `${COLORS.success}10`, padding: 10, borderRadius: 8, gap: 8 },
    pickupContactText: { color: COLORS.success, fontSize: 13, fontWeight: '600' },

    instructionsCard: { flexDirection: 'row', backgroundColor: `${COLORS.warning}15`, borderRadius: 12, padding: 16, gap: 12 },
    instructionsText: { flex: 1, fontSize: 14, color: COLORS.text },

    itemsCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    itemName: { fontSize: 14, color: COLORS.text },
    itemQty: { fontSize: 14, fontWeight: '600', color: COLORS.muted },

    codCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${COLORS.warning}15`, borderRadius: 12, padding: 16 },
    codContent: { marginLeft: 12 },
    codLabel: { fontSize: 12, color: COLORS.muted },
    codAmount: { fontSize: 20, fontWeight: 'bold', color: COLORS.warning },

    timelineCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16 },
    timelineItem: { flexDirection: 'row', marginBottom: 16 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginTop: 4, marginRight: 12 },
    timelineContent: {},
    timelineStatus: { fontSize: 13, fontWeight: '600', color: COLORS.text },
    timelineTime: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

    actionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 12,
    },
    failButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.error,
        gap: 8,
    },
    failButtonText: { color: COLORS.error, fontWeight: '600' },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    actionButtonDisabled: { opacity: 0.7 },
    actionButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
    modalInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 15 },
    photoButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 24, marginBottom: 20, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
    photoButtonText: { color: COLORS.muted, marginTop: 8 },
    photoPreview: { width: 150, height: 100, borderRadius: 8 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
    modalCancelText: { color: COLORS.text, fontWeight: '600' },
    modalConfirm: { flex: 1, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalConfirmText: { color: COLORS.white, fontWeight: '600' },

    proofContainer: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 4, marginBottom: 16 },
    proofToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 8 },
    proofToggleActive: { backgroundColor: COLORS.primary },
    proofToggleText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
    proofToggleTextActive: { color: COLORS.white },
    proofContent: { gap: 16, marginBottom: 20 },
    signatureWrapper: { height: 180, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    signaturePreviewContainer: { height: 180, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    signaturePreview: { width: '100%', height: 120 },
    clearSignature: { padding: 8 },
    clearSignatureText: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
    photoButtonSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', gap: 10 },
    photoButtonTextSmall: { color: COLORS.muted, fontSize: 13 },
    photoPreviewSmall: { width: 60, height: 40, borderRadius: 4 },
});

export default DeliveryDetailsScreen;
