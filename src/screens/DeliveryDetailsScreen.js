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
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';
import * as ImagePicker from 'expo-image-picker';

const DeliveryDetailsScreen = ({ route, navigation }) => {
    const { deliveryId } = route.params;
    const [delivery, setDelivery] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showFailModal, setShowFailModal] = useState(false);
    const [recipientName, setRecipientName] = useState('');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [failureReason, setFailureReason] = useState('');
    const [deliveryPhoto, setDeliveryPhoto] = useState(null);

    useEffect(() => {
        loadDeliveryDetails();
    }, [deliveryId]);

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

    const handleComplete = async () => {
        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('recipient_name', recipientName);
            formData.append('notes', deliveryNotes);

            if (deliveryPhoto) {
                formData.append('delivery_photo', {
                    uri: deliveryPhoto,
                    type: 'image/jpeg',
                    name: 'delivery_proof.jpg'
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
            Alert.alert('Error', 'An error occurred');
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

    const callCustomer = () => {
        if (delivery?.delivery_contact_phone) {
            Linking.openURL(`tel:${delivery.delivery_contact_phone}`);
        }
    };

    const openMaps = () => {
        if (delivery?.delivery_latitude && delivery?.delivery_longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${delivery.delivery_latitude},${delivery.delivery_longitude}`;
            Linking.openURL(url);
        } else if (delivery?.delivery_address) {
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.delivery_address)}`;
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
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(delivery?.status) }]}>
                        <Text style={styles.statusText}>{delivery?.status?.replace('_', ' ').toUpperCase()}</Text>
                    </View>
                    <Text style={styles.orderNumber}>{delivery?.order_number}</Text>
                    <Text style={styles.earning}>Earn: ₵{parseFloat(delivery?.courier_earning || 0).toFixed(2)}</Text>
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
                    </View>
                </View>

                {/* Delivery Address */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
                    <TouchableOpacity style={styles.addressCard} onPress={openMaps}>
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
                <View style={styles.actionContainer}>
                    {delivery?.status !== 'pending' && (
                        <TouchableOpacity
                            style={styles.failButton}
                            onPress={() => setShowFailModal(true)}
                        >
                            <Ionicons name="close-circle" size={20} color={COLORS.error} />
                            <Text style={styles.failButtonText}>Can't Deliver</Text>
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
                        disabled={actionLoading}
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
            <Modal visible={showCompleteModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Complete Delivery</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Recipient Name"
                            value={recipientName}
                            onChangeText={setRecipientName}
                        />

                        <TextInput
                            style={[styles.modalInput, { height: 80 }]}
                            placeholder="Delivery Notes (optional)"
                            value={deliveryNotes}
                            onChangeText={setDeliveryNotes}
                            multiline
                        />

                        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                            {deliveryPhoto ? (
                                <Image source={{ uri: deliveryPhoto }} style={styles.photoPreview} />
                            ) : (
                                <>
                                    <Ionicons name="camera" size={32} color={COLORS.muted} />
                                    <Text style={styles.photoButtonText}>Take Proof Photo</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setShowCompleteModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirm, actionLoading && { opacity: 0.7 }]}
                                onPress={handleComplete}
                                disabled={actionLoading}
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
            <Modal visible={showFailModal} animationType="slide" transparent>
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
                                style={[styles.modalConfirm, { backgroundColor: COLORS.error }, actionLoading && { opacity: 0.7 }]}
                                onPress={handleFail}
                                disabled={actionLoading}
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
});

export default DeliveryDetailsScreen;
