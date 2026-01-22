import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const SupportTicketScreen = ({ navigation, route }) => {
    const { deliveryId, reason = '' } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [issueType, setIssueType] = useState(reason || 'general');
    const [description, setDescription] = useState('');

    const issueTypes = [
        { id: 'wrong_address', label: 'Wrong Address', icon: 'map' },
        { id: 'customer_unreachable', label: 'Customer Unreachable', icon: 'call' },
        { id: 'package_damaged', label: 'Package Damaged', icon: 'cube' },
        { id: 'vehicle_breakdown', label: 'Vehicle Breakdown', icon: 'bicycle' },
        { id: 'payment_issue', label: 'Payment Issue', icon: 'cash' },
        { id: 'other', label: 'Other', icon: 'help-circle' },
    ];

    const handleSubmit = async () => {
        if (!description.trim()) {
            Alert.alert('Error', 'Please describe the issue');
            return;
        }

        setLoading(true);
        try {
            const response = await courierApi.reportIssue({
                delivery_id: deliveryId,
                issue_type: issueType,
                description: description
            });

            if (response.success) {
                Alert.alert(
                    'Ticket Raised',
                    'Your report has been submitted. Support will contact you shortly.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', response.error || 'Failed to submit report');
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Report an Issue</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionTitle}>WHAT IS THE PROBLEM?</Text>
                <View style={styles.typesGrid}>
                    {issueTypes.map((type) => (
                        <TouchableOpacity
                            key={type.id}
                            style={[
                                styles.typeCard,
                                issueType === type.id && styles.typeCardSelected
                            ]}
                            onPress={() => setIssueType(type.id)}
                        >
                            <View style={[
                                styles.iconContainer,
                                issueType === type.id && styles.iconContainerSelected
                            ]}>
                                <Ionicons
                                    name={type.icon}
                                    size={24}
                                    color={issueType === type.id ? COLORS.white : COLORS.primary}
                                />
                            </View>
                            <Text style={[
                                styles.typeLabel,
                                issueType === type.id && styles.typeLabelSelected
                            ]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>TELL US MORE</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Describe the situation in detail..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                />

                <View style={styles.infoBox}>
                    <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                    <Text style={styles.infoText}>
                        Raising a ticket for a delivery helps us protect your rating and resolve disputes faster.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <Text style={styles.submitButtonText}>Submit Report</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: COLORS.primary,
        padding: 16,
        paddingTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },

    content: { padding: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 16, letterSpacing: 1 },

    typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    typeCard: {
        width: '48%',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    typeCardSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}05` },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainerSelected: { backgroundColor: COLORS.primary },
    typeLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
    typeLabelSelected: { color: COLORS.primary },

    textArea: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
        minHeight: 120,
    },

    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${COLORS.success}10`,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        alignItems: 'center',
        marginBottom: 30,
    },
    infoText: { flex: 1, fontSize: 13, color: COLORS.success, lineHeight: 18 },

    submitButton: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});

export default SupportTicketScreen;
