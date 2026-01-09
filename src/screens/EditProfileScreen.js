import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const EditProfileScreen = ({ navigation, route }) => {
    const { profile } = route.params;

    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState(profile?.phone || '');
    const [vehicleType, setVehicleType] = useState(profile?.vehicle_type || 'motorcycle');
    const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicle_number || '');
    const [licenseNumber, setLicenseNumber] = useState(profile?.license_number || '');

    const handleUpdate = async () => {
        if (!phone) {
            Alert.alert('Error', 'Phone number is required');
            return;
        }

        setLoading(true);
        try {
            const data = {
                phone,
                vehicle_type: vehicleType,
                vehicle_number: vehicleNumber,
                license_number: licenseNumber
            };

            const response = await courierApi.updateProfile(data);
            if (response.success) {
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.error || 'Failed to update profile');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const VehicleOption = ({ type, label, icon }) => (
        <TouchableOpacity
            style={[
                styles.vehicleOption,
                vehicleType === type && styles.vehicleOptionSelected
            ]}
            onPress={() => setVehicleType(type)}
        >
            <Ionicons
                name={icon}
                size={24}
                color={vehicleType === type ? COLORS.white : COLORS.primary}
            />
            <Text style={[
                styles.vehicleLabel,
                vehicleType === type && styles.vehicleLabelSelected
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
                        <Text style={styles.label}>Select Vehicle Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                            <VehicleOption type="motorcycle" label="Motorcycle" icon="bicycle" />
                            <VehicleOption type="bicycle" label="Bicycle" icon="bicycle-outline" />
                            <VehicleOption type="car" label="Car" icon="car-outline" />
                            <VehicleOption type="van" label="Van" icon="bus-outline" />
                        </ScrollView>

                        <Text style={styles.label}>Vehicle Plate Number</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="information-circle-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. GW 1234-22"
                                value={vehicleNumber}
                                onChangeText={setVehicleNumber}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DOCUMENTS</Text>
                        <Text style={styles.label}>Driving License Number</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="card-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="License Number"
                                value={licenseNumber}
                                onChangeText={setLicenseNumber}
                                autoCapitalize="characters"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.updateButton, loading && styles.buttonDisabled]}
                        onPress={handleUpdate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.buttonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        backgroundColor: COLORS.primary,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: { marginRight: 16 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },

    scrollContent: { padding: 16 },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.muted, marginBottom: 12, letterSpacing: 1 },

    label: { fontSize: 14, color: COLORS.text, marginBottom: 8, fontWeight: '500' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: COLORS.text, fontSize: 16 },

    vehicleScroll: { marginBottom: 16, paddingVertical: 4 },
    vehicleOption: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginRight: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        minWidth: 100,
    },
    vehicleOptionSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    vehicleLabel: { fontSize: 12, color: COLORS.primary, marginTop: 4, fontWeight: '600' },
    vehicleLabelSelected: { color: COLORS.white },

    updateButton: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
});

export default EditProfileScreen;
