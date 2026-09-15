/**
 * FailedDeliveryScreen — Courier App
 *
 * SOP: Failed Delivery Steps 1 & 2
 *  Step 1: Rider documents failure at location (reason code, photo, 2 call attempts, WhatsApp)
 *  Step 2: Notify Coordinator within 5 minutes
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, TextInput, Linking, Platform,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../theme/ThemeContext';
import courierApi from '../services/courierApi';

// ─── Failure reason codes (SOP Step 1) ────────────────────────────────────────

const FAILURE_REASONS = [
    { code: 'customer_absent',   label: 'Customer Absent',   icon: 'person-remove-outline' },
    { code: 'wrong_address',     label: 'Wrong Address',     icon: 'location-outline' },
    { code: 'refused_delivery',  label: 'Refused Delivery',  icon: 'hand-left-outline' },
    { code: 'other',             label: 'Other',             icon: 'ellipsis-horizontal-circle-outline' },
];

// WhatsApp Template F1 — used when customer is unreachable after 2 calls
const templateF1 = (orderId, customerName) =>
    `Hello ${customerName || 'valued customer'}, we attempted to deliver your order #${orderId} but were unable to reach you. Please reply to reschedule your delivery or call us back. Thank you – Tezeon Delivery Team.`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function FailedDeliveryScreen({ route, navigation }) {
    const { deliveryId, orderId, customerName, customerPhone } = route.params || {};
    const { colors } = useTheme();
    const styles = createStyles(colors);

    const [selectedReason, setSelectedReason]   = useState(null);
    const [notes, setNotes]                      = useState('');
    const [locationPhoto, setLocationPhoto]      = useState(null);
    const [callAttempt1, setCallAttempt1]        = useState(false);
    const [callAttempt2, setCallAttempt2]        = useState(false);
    const [whatsappSent, setWhatsappSent]        = useState(false);
    const [submitting, setSubmitting]            = useState(false);
    const [callTimer, setCallTimer]              = useState(0);  // seconds since first call
    const [timerActive, setTimerActive]          = useState(false);
    const timerRef                               = useRef(null);

    // 3-minute timer between calls (SOP: wait 3 minutes between calls)
    useEffect(() => {
        if (timerActive && callTimer < 180) {
            timerRef.current = setInterval(() => {
                setCallTimer(prev => {
                    if (prev >= 179) {
                        clearInterval(timerRef.current);
                        setTimerActive(false);
                        return 180;
                    }
                    return prev + 1;
                });
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [timerActive]);

    const handleCall1 = () => {
        if (!customerPhone) return Alert.alert('Error', 'No customer phone number available.');
        Linking.openURL(`tel:${customerPhone}`);
        setCallAttempt1(true);
        setCallTimer(0);
        setTimerActive(true);
    };

    const handleCall2 = () => {
        if (callTimer < 180) {
            const remaining = Math.ceil((180 - callTimer) / 60);
            return Alert.alert('Wait Required', `SOP requires waiting 3 minutes between calls. Please wait ${remaining} more minute(s).`);
        }
        if (!customerPhone) return Alert.alert('Error', 'No customer phone number available.');
        Linking.openURL(`tel:${customerPhone}`);
        setCallAttempt2(true);
    };

    const handleWhatsApp = () => {
        const message = encodeURIComponent(templateF1(orderId, customerName));
        const phone = customerPhone?.replace(/[^0-9]/g, '');
        Linking.openURL(`whatsapp://send?phone=${phone}&text=${message}`);
        setWhatsappSent(true);
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                return Alert.alert('Permission Required', 'Camera permission is required to take a location photo.');
            }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
                allowsEditing: false,
            });
            if (!result.canceled && result.assets?.[0]) {
                setLocationPhoto(result.assets[0]);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to open camera.');
        }
    };

    const canSubmit = () => {
        return selectedReason && locationPhoto && callAttempt1 && callAttempt2;
    };

    const handleSubmit = async () => {
        if (!selectedReason) return Alert.alert('Required', 'Please select a failure reason code.');
        if (!locationPhoto) return Alert.alert('Required', 'Please take a photo of the delivery location (SOP Step 1).');
        if (!callAttempt1 || !callAttempt2) {
            return Alert.alert('Required', 'SOP requires 2 call attempts before logging a failure.');
        }

        Alert.alert(
            'Report Failed Delivery',
            'This will log the failure and notify your Coordinator. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm & Notify',
                    onPress: async () => {
                        setSubmitting(true);
                        try {
                            const formData = new FormData();
                            formData.append('failure_reason', selectedReason);
                            formData.append('notes', notes);
                            formData.append('call_attempt_1', 'true');
                            formData.append('call_attempt_2', 'true');
                            formData.append('whatsapp_sent', String(whatsappSent));
                            if (locationPhoto) {
                                formData.append('location_photo', {
                                    uri: locationPhoto.uri,
                                    type: 'image/jpeg',
                                    name: `failed_delivery_${deliveryId}.jpg`,
                                });
                            }

                            const res = await courierApi.reportFailedDelivery(deliveryId, formData);

                            if (res.success) {
                                Alert.alert(
                                    'Reported',
                                    'Failure logged and Coordinator has been notified. Move to your next order.',
                                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                                );
                            } else {
                                Alert.alert('Error', res.error || 'Failed to submit. Please try again.');
                            }
                        } catch (e) {
                            Alert.alert('Error', e.message || 'Submission failed.');
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const formatTimer = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={colors.white} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Failed Delivery Report</Text>
                    <Text style={styles.headerSub}>Order #{orderId || deliveryId}</Text>
                </View>
                <View style={styles.sopBadge}>
                    <Text style={styles.sopBadgeText}>SOP</Text>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

                {/* Progress Banner */}
                <View style={styles.progressBanner}>
                    <Ionicons name="information-circle" size={18} color={colors.warning} />
                    <Text style={styles.progressText}>
                        Complete all steps before proceeding to next order
                    </Text>
                </View>

                {/* ── Step 1: Reason Code ── */}
                <View style={styles.section}>
                    <View style={styles.stepHeader}>
                        <View style={[styles.stepNum, !selectedReason && styles.stepNumPending]}>
                            <Text style={styles.stepNumText}>1</Text>
                        </View>
                        <Text style={styles.stepTitle}>Select Failure Reason Code</Text>
                        {selectedReason && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                    </View>
                    <View style={styles.reasonGrid}>
                        {FAILURE_REASONS.map(r => (
                            <TouchableOpacity
                                key={r.code}
                                style={[styles.reasonCard, selectedReason === r.code && styles.reasonCardActive]}
                                onPress={() => setSelectedReason(r.code)}
                            >
                                <Ionicons
                                    name={r.icon}
                                    size={24}
                                    color={selectedReason === r.code ? colors.white : colors.primary}
                                />
                                <Text style={[styles.reasonLabel, selectedReason === r.code && styles.reasonLabelActive]}>
                                    {r.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ── Step 2: Location Photo ── */}
                <View style={styles.section}>
                    <View style={styles.stepHeader}>
                        <View style={[styles.stepNum, !locationPhoto && styles.stepNumPending]}>
                            <Text style={styles.stepNumText}>2</Text>
                        </View>
                        <Text style={styles.stepTitle}>Photo of Delivery Location</Text>
                        {locationPhoto && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                    </View>
                    <Text style={styles.stepDesc}>Take a photo of the door, gate, or building (required by SOP)</Text>
                    {locationPhoto ? (
                        <View style={styles.photoContainer}>
                            <Image source={{ uri: locationPhoto.uri }} style={styles.photoPreview} />
                            <TouchableOpacity style={styles.retakeBtn} onPress={handleTakePhoto}>
                                <Ionicons name="camera" size={16} color={colors.primary} />
                                <Text style={styles.retakeBtnText}>Retake</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                            <Ionicons name="camera-outline" size={32} color={colors.muted} />
                            <Text style={styles.photoBtnText}>Tap to take photo</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Step 3: Call Attempts ── */}
                <View style={styles.section}>
                    <View style={styles.stepHeader}>
                        <View style={[styles.stepNum, (!callAttempt1 || !callAttempt2) && styles.stepNumPending]}>
                            <Text style={styles.stepNumText}>3</Text>
                        </View>
                        <Text style={styles.stepTitle}>2 Call Attempts Required</Text>
                        {callAttempt1 && callAttempt2 && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                    </View>
                    <Text style={styles.stepDesc}>Call customer twice, wait 3 minutes between calls</Text>

                    <View style={styles.customerInfo}>
                        <Ionicons name="person-circle-outline" size={20} color={colors.textLight} />
                        <Text style={styles.customerName}>{customerName || 'Customer'}</Text>
                        <Text style={styles.customerPhone}>{customerPhone || 'No phone'}</Text>
                    </View>

                    <View style={styles.callRow}>
                        <TouchableOpacity
                            style={[styles.callBtn, callAttempt1 && styles.callBtnDone]}
                            onPress={handleCall1}
                        >
                            <Ionicons
                                name={callAttempt1 ? 'checkmark-circle' : 'call-outline'}
                                size={18}
                                color={callAttempt1 ? colors.success : colors.white}
                            />
                            <Text style={[styles.callBtnText, callAttempt1 && styles.callBtnTextDone]}>
                                {callAttempt1 ? 'Call 1 Done' : 'Call 1'}
                            </Text>
                        </TouchableOpacity>

                        {callAttempt1 && !callAttempt2 && (
                            <View style={styles.timerPill}>
                                <Ionicons name="timer-outline" size={14} color={callTimer >= 180 ? colors.success : colors.warning} />
                                <Text style={[styles.timerText, { color: callTimer >= 180 ? colors.success : colors.warning }]}>
                                    {callTimer >= 180 ? 'Ready' : formatTimer(callTimer)}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.callBtn,
                                !callAttempt1 && styles.callBtnDisabled,
                                callAttempt2 && styles.callBtnDone
                            ]}
                            onPress={handleCall2}
                            disabled={!callAttempt1}
                        >
                            <Ionicons
                                name={callAttempt2 ? 'checkmark-circle' : 'call-outline'}
                                size={18}
                                color={callAttempt2 ? colors.success : !callAttempt1 ? colors.muted : colors.white}
                            />
                            <Text style={[
                                styles.callBtnText,
                                callAttempt2 && styles.callBtnTextDone,
                                !callAttempt1 && styles.callBtnTextDisabled
                            ]}>
                                {callAttempt2 ? 'Call 2 Done' : 'Call 2'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Step 4: WhatsApp (if no answer) ── */}
                <View style={styles.section}>
                    <View style={styles.stepHeader}>
                        <View style={[styles.stepNum, styles.stepNumOptional]}>
                            <Text style={styles.stepNumText}>4</Text>
                        </View>
                        <Text style={styles.stepTitle}>Send WhatsApp (Template F1)</Text>
                        {whatsappSent && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                    </View>
                    <Text style={styles.stepDesc}>If no answer after both calls, send WhatsApp using Template F1</Text>

                    <View style={styles.templateBox}>
                        <Text style={styles.templateText}>{templateF1(orderId, customerName)}</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.whatsappBtn, whatsappSent && styles.whatsappBtnSent]}
                        onPress={handleWhatsApp}
                        disabled={!callAttempt2}
                    >
                        <Ionicons
                            name={whatsappSent ? 'checkmark-circle' : 'logo-whatsapp'}
                            size={18}
                            color={colors.white}
                        />
                        <Text style={styles.whatsappBtnText}>
                            {whatsappSent ? 'WhatsApp Sent' : 'Send WhatsApp F1'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ── Step 5: Notes ── */}
                <View style={styles.section}>
                    <View style={styles.stepHeader}>
                        <View style={styles.stepNum}>
                            <Text style={styles.stepNumText}>5</Text>
                        </View>
                        <Text style={styles.stepTitle}>Additional Notes (Optional)</Text>
                    </View>
                    <TextInput
                        style={styles.notesInput}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any additional details about the failure..."
                        placeholderTextColor={colors.muted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                {/* Submit */}
                <View style={styles.submitSection}>
                    {!canSubmit() && (
                        <Text style={styles.submitHint}>
                            Complete steps 1–3 to submit
                        </Text>
                    )}
                    <TouchableOpacity
                        style={[styles.submitBtn, !canSubmit() && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={!canSubmit() || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="paper-plane-outline" size={18} color={colors.white} />
                                <Text style={styles.submitBtnText}>Report & Notify Coordinator</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors) => StyleSheet.create({
    container:  { flex: 1, backgroundColor: colors.background || '#F5F5F5' },

    header: {
        backgroundColor: colors.error || '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
    headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
    sopBadge: {
        marginLeft: 'auto',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    sopBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

    scroll:        { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    progressBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.warning || '#F59E0B'}15`,
        borderLeftWidth: 3,
        borderLeftColor: colors.warning || '#F59E0B',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    progressText: { flex: 1, fontSize: 13, color: colors.text || '#333' },

    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
    },
    stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
    stepNum: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary || '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumPending: { backgroundColor: colors.muted || '#9CA3AF' },
    stepNumOptional: { backgroundColor: '#25D366' },
    stepNumText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
    stepTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text || '#333' },
    stepDesc:  { fontSize: 13, color: colors.textLight || '#777', marginBottom: 12, lineHeight: 18 },

    reasonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    reasonCard: {
        flex: 1,
        minWidth: '44%',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.border || '#E0E0E0',
        backgroundColor: colors.background || '#F5F5F5',
        gap: 6,
    },
    reasonCardActive: {
        backgroundColor: colors.primary || '#FF6B35',
        borderColor: colors.primary || '#FF6B35',
    },
    reasonLabel: { fontSize: 12, fontWeight: '600', color: colors.text || '#333', textAlign: 'center' },
    reasonLabelActive: { color: '#fff' },

    photoBtn: {
        height: 120,
        borderRadius: 10,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: colors.border || '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    photoBtnText: { color: colors.muted || '#9CA3AF', fontSize: 13 },
    photoContainer: { gap: 8 },
    photoPreview: { width: '100%', height: 160, borderRadius: 10 },
    retakeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        gap: 4,
        paddingVertical: 4,
    },
    retakeBtnText: { color: colors.primary || '#FF6B35', fontSize: 13, fontWeight: '600' },

    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.background || '#F5F5F5',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    customerName:  { fontSize: 14, fontWeight: '600', color: colors.text || '#333' },
    customerPhone: { fontSize: 13, color: colors.textLight || '#777', marginLeft: 'auto' },

    callRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    callBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary || '#FF6B35',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
    },
    callBtnDone:     { backgroundColor: `${colors.success || '#10B981'}15`, borderWidth: 1, borderColor: colors.success || '#10B981' },
    callBtnDisabled: { backgroundColor: colors.border || '#E0E0E0' },
    callBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    callBtnTextDone: { color: colors.success || '#10B981' },
    callBtnTextDisabled: { color: colors.muted || '#9CA3AF' },
    timerPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.background || '#F5F5F5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    timerText: { fontSize: 13, fontWeight: '700' },

    templateBox: {
        backgroundColor: '#E9FBF0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#25D366',
    },
    templateText: { fontSize: 12, color: '#333', lineHeight: 18 },

    whatsappBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#25D366',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 8,
    },
    whatsappBtnSent: { backgroundColor: `${colors.success || '#10B981'}` },
    whatsappBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    notesInput: {
        borderWidth: 1,
        borderColor: colors.border || '#E0E0E0',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: colors.text || '#333',
        backgroundColor: colors.background || '#F5F5F5',
        minHeight: 80,
    },

    submitSection: { marginTop: 8, gap: 8 },
    submitHint: { textAlign: 'center', fontSize: 13, color: colors.muted || '#9CA3AF' },
    submitBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.error || '#EF4444',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    submitBtnDisabled: { backgroundColor: colors.muted || '#9CA3AF' },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
