import React, { useState, useEffect, useMemo } from 'react';
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
    Platform,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import courierApi from '../services/courierApi';
import { useTheme } from '../theme/ThemeContext';

const EditProfileScreen = ({ navigation, route }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { profile } = route.params;

    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState(profile?.phone || '');
    const [vehicleType, setVehicleType] = useState(profile?.vehicle_type || 'motorcycle');
    const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicle_number || '');
    const [vehicleMake, setVehicleMake] = useState(profile?.vehicle_make || '');
    const [vehicleColor, setVehicleColor] = useState(profile?.vehicle_color || '');

    // Document fields
    const [ghanaCardNumber, setGhanaCardNumber] = useState(profile?.ghana_card_number || '');
    const [ghanaCardFront, setGhanaCardFront] = useState(profile?.ghana_card_photo || null);
    const [ghanaCardBack, setGhanaCardBack] = useState(profile?.id_card_photo || null);
    const [licenseNumber, setLicenseNumber] = useState(profile?.license_number || '');
    const [licenseFront, setLicenseFront] = useState(profile?.driving_license_photo || null);
    const [licenseBack, setLicenseBack] = useState(profile?.driving_license_back_photo || null);
    const [vehiclePhoto, setVehiclePhoto] = useState(profile?.vehicle_photo || null);

    const pickImage = async (setter) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll access is required');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const takePhoto = async (setter) => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required');
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const showImageOptions = (setter, label) => {
        Alert.alert(
            `Upload ${label}`,
            'Choose an option',
            [
                { text: 'Take Photo', onPress: () => takePhoto(setter) },
                { text: 'Choose from Gallery', onPress: () => pickImage(setter) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleUpdate = async () => {
        if (!phone) {
            Alert.alert('Error', 'Phone number is required');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();

            // Basic info
            formData.append('phone', phone);
            formData.append('vehicle_type', vehicleType);
            formData.append('vehicle_number', vehicleNumber);
            if (vehicleMake) formData.append('vehicle_make', vehicleMake);
            if (vehicleColor) formData.append('vehicle_color', vehicleColor);

            // Document numbers
            if (ghanaCardNumber) formData.append('ghana_card_number', ghanaCardNumber);
            if (licenseNumber) formData.append('license_number', licenseNumber);

            // Helper to append images (only new uploads, not existing URLs)
            const appendImage = (key, uri) => {
                if (uri && !uri.startsWith('http')) {
                    const filename = uri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : 'image/jpeg';
                    formData.append(key, { uri, name: filename, type });
                }
            };

            appendImage('ghana_card_photo', ghanaCardFront);
            appendImage('id_card_photo', ghanaCardBack);
            appendImage('driving_license_photo', licenseFront);
            appendImage('driving_license_back_photo', licenseBack);
            appendImage('vehicle_photo', vehiclePhoto);

            // Check if we have any images to upload
            const hasNewImages = [ghanaCardFront, ghanaCardBack, licenseFront, licenseBack, vehiclePhoto]
                .some(uri => uri && !uri.startsWith('http'));

            let response;
            if (hasNewImages) {
                response = await courierApi.updateProfileWithDocuments(formData);
            } else {
                // No images, use regular update
                response = await courierApi.updateProfile({
                    phone,
                    vehicle_type: vehicleType,
                    vehicle_number: vehicleNumber,
                    vehicle_make: vehicleMake,
                    vehicle_color: vehicleColor,
                    ghana_card_number: ghanaCardNumber,
                    license_number: licenseNumber
                });
            }

            if (response.success) {
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Update error:', error);
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
                color={vehicleType === type ? colors.white : colors.primary}
            />
            <Text style={[
                styles.vehicleLabel,
                vehicleType === type && styles.vehicleLabelSelected
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const DocumentUpload = ({ label, value, setter, required = false }) => (
        <View style={styles.documentContainer}>
            <Text style={styles.documentLabel}>
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            <TouchableOpacity
                style={[styles.documentPicker, value && styles.documentPickerActive]}
                onPress={() => showImageOptions(setter, label)}
            >
                {value ? (
                    <>
                        <Image
                            source={{ uri: value }}
                            style={styles.documentPreview}
                        />
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={12} color={colors.white} />
                        </View>
                    </>
                ) : (
                    <View style={styles.documentPlaceholder}>
                        <Ionicons name="camera" size={24} color={colors.muted} />
                        <Text style={styles.documentPlaceholderText}>Upload</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Contact Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Vehicle Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>VEHICLE DETAILS</Text>
                        <Text style={styles.label}>Select Vehicle Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                            <VehicleOption type="motorcycle" label="Motorcycle" icon="bicycle" />
                            <VehicleOption type="bicycle" label="Bicycle" icon="bicycle-outline" />
                            <VehicleOption type="car" label="Car" icon="car-outline" />
                            <VehicleOption type="van" label="Van" icon="bus-outline" />
                            <VehicleOption type="truck" label="Truck" icon="bus" />
                        </ScrollView>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Plate Number</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="GW 1234-22"
                                        value={vehicleNumber}
                                        onChangeText={setVehicleNumber}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </View>
                            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>Make/Brand</Text>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Honda"
                                        value={vehicleMake}
                                        onChangeText={setVehicleMake}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Color</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Red"
                                    value={vehicleColor}
                                    onChangeText={setVehicleColor}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Vehicle Photo</Text>
                        <TouchableOpacity
                            style={[styles.vehiclePhotoPicker, vehiclePhoto && styles.vehiclePhotoPickerActive]}
                            onPress={() => showImageOptions(setVehiclePhoto, 'Vehicle Photo')}
                        >
                            {vehiclePhoto ? (
                                <>
                                    <Image source={{ uri: vehiclePhoto }} style={styles.vehiclePhotoPreview} />
                                    <View style={styles.editBadgeLarge}>
                                        <Ionicons name="pencil" size={16} color={colors.white} />
                                    </View>
                                </>
                            ) : (
                                <View style={styles.vehiclePhotoPlaceholder}>
                                    <Ionicons name="camera" size={32} color={colors.muted} />
                                    <Text style={styles.vehiclePhotoPlaceholderText}>Add vehicle photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Ghana Card Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>GHANA CARD (NIA)</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>NIA Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="card-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="GHA-123456789-0"
                                    value={ghanaCardNumber}
                                    onChangeText={setGhanaCardNumber}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        <View style={styles.documentRow}>
                            <DocumentUpload
                                label="Front"
                                value={ghanaCardFront}
                                setter={setGhanaCardFront}
                            />
                            <DocumentUpload
                                label="Back"
                                value={ghanaCardBack}
                                setter={setGhanaCardBack}
                            />
                        </View>
                    </View>

                    {/* Driving License Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DRIVING LICENSE</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>License Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="document-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your license number"
                                    value={licenseNumber}
                                    onChangeText={setLicenseNumber}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>

                        <View style={styles.documentRow}>
                            <DocumentUpload
                                label="Front"
                                value={licenseFront}
                                setter={setLicenseFront}
                            />
                            <DocumentUpload
                                label="Back"
                                value={licenseBack}
                                setter={setLicenseBack}
                            />
                        </View>
                    </View>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                        <Text style={styles.infoText}>
                            Document changes require re-verification by our team. You'll be notified once approved.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.updateButton, loading && styles.buttonDisabled]}
                        onPress={handleUpdate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
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

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        backgroundColor: colors.primary,
        padding: 16,
        paddingVertical: 14,
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.white },

    scrollContent: { padding: 16 },

    section: { marginBottom: 24 },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.muted,
        marginBottom: 16,
        letterSpacing: 1
    },

    label: { fontSize: 13, color: colors.text, marginBottom: 8, fontWeight: '600' },
    required: { color: colors.error },

    inputGroup: { marginBottom: 12 },
    row: { flexDirection: 'row', marginBottom: 12 },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 50,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: colors.text, fontSize: 15 },

    vehicleScroll: { marginBottom: 16, paddingVertical: 4 },
    vehicleOption: {
        backgroundColor: colors.white,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginRight: 10,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
        minWidth: 85,
    },
    vehicleOptionSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    vehicleLabel: { fontSize: 11, color: colors.primary, marginTop: 4, fontWeight: '600' },
    vehicleLabelSelected: { color: colors.white },

    // Vehicle Photo
    vehiclePhotoPicker: {
        height: 120,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    vehiclePhotoPickerActive: {
        borderStyle: 'solid',
        borderColor: colors.primary,
    },
    vehiclePhotoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vehiclePhotoPlaceholderText: {
        fontSize: 13,
        color: colors.muted,
        marginTop: 8,
    },
    vehiclePhotoPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editBadgeLarge: {
        position: 'absolute',
        right: 10,
        bottom: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Document uploads
    documentRow: {
        flexDirection: 'row',
        gap: 12,
    },
    documentContainer: {
        flex: 1,
    },
    documentLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    documentPicker: {
        height: 90,
        backgroundColor: colors.white,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    documentPickerActive: {
        borderStyle: 'solid',
        borderColor: colors.primary,
    },
    documentPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentPlaceholderText: {
        fontSize: 11,
        color: colors.muted,
        marginTop: 4,
    },
    documentPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editBadge: {
        position: 'absolute',
        right: 6,
        bottom: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Info box
    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${colors.primary}10`,
        padding: 14,
        borderRadius: 12,
        gap: 10,
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: colors.primary,
        lineHeight: 18,
    },

    updateButton: {
        backgroundColor: colors.primary,
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default EditProfileScreen;
