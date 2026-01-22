import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const VEHICLE_TYPES = [
    { type: 'motorcycle', label: 'Motorcycle', icon: 'bicycle' },
    { type: 'bicycle', label: 'Bicycle', icon: 'bicycle-outline' },
    { type: 'car', label: 'Car', icon: 'car-outline' },
    { type: 'van', label: 'Van', icon: 'bus-outline' },
    { type: 'truck', label: 'Truck', icon: 'bus' },
];

const VehicleSetupScreen = ({ navigation, route }) => {
    const isFirstSetup = route.params?.isFirstSetup || false;
    const existingProfile = route.params?.profile || null;

    const [step, setStep] = useState(1); // 1: Vehicle, 2: Documents
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Vehicle Info
    const [vehicleType, setVehicleType] = useState(existingProfile?.vehicle_type || 'motorcycle');
    const [vehicleNumber, setVehicleNumber] = useState(existingProfile?.vehicle_number || '');
    const [vehicleMake, setVehicleMake] = useState(existingProfile?.vehicle_make || '');
    const [vehicleColor, setVehicleColor] = useState(existingProfile?.vehicle_color || '');

    // Documents
    const [ghanaCardNumber, setGhanaCardNumber] = useState(existingProfile?.ghana_card_number || '');
    const [ghanaCardFront, setGhanaCardFront] = useState(existingProfile?.ghana_card_photo || null);
    const [ghanaCardBack, setGhanaCardBack] = useState(existingProfile?.id_card_photo || null);
    const [licenseNumber, setLicenseNumber] = useState(existingProfile?.license_number || '');
    const [licenseFront, setLicenseFront] = useState(existingProfile?.driving_license_photo || null);
    const [licenseBack, setLicenseBack] = useState(existingProfile?.driving_license_back_photo || null);
    const [vehiclePhoto, setVehiclePhoto] = useState(existingProfile?.vehicle_photo || null);

    const pickImage = async (setter) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera roll access is required to upload photos.');
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
            Alert.alert('Permission Denied', 'Camera access is required to take photos.');
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

    const validateStep1 = () => {
        if (!vehicleType) {
            Alert.alert('Required', 'Please select a vehicle type');
            return false;
        }
        if (vehicleType !== 'bicycle' && !vehicleNumber.trim()) {
            Alert.alert('Required', 'Please enter your vehicle registration number');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!ghanaCardNumber.trim()) {
            Alert.alert('Required', 'Please enter your Ghana Card NIA number');
            return false;
        }
        if (!ghanaCardFront) {
            Alert.alert('Required', 'Please upload the front of your Ghana Card');
            return false;
        }
        if (!ghanaCardBack) {
            Alert.alert('Required', 'Please upload the back of your Ghana Card');
            return false;
        }
        // License is required for motorized vehicles
        if (vehicleType !== 'bicycle') {
            if (!licenseNumber.trim()) {
                Alert.alert('Required', 'Please enter your driving license number');
                return false;
            }
            if (!licenseFront || !licenseBack) {
                Alert.alert('Required', 'Please upload both front and back of your driving license');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigation.goBack();
        }
    };

    const handleSubmit = async () => {
        if (!validateStep2()) return;

        setSaving(true);
        try {
            const formData = new FormData();

            // Vehicle info
            formData.append('vehicle_type', vehicleType);
            formData.append('vehicle_number', vehicleNumber);
            if (vehicleMake) formData.append('vehicle_make', vehicleMake);
            if (vehicleColor) formData.append('vehicle_color', vehicleColor);

            // Documents
            formData.append('ghana_card_number', ghanaCardNumber);
            if (licenseNumber) formData.append('license_number', licenseNumber);

            // Helper to append images
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

            const response = await courierApi.updateProfileWithDocuments(formData);

            if (response.success) {
                Alert.alert(
                    '🎉 Setup Complete!',
                    'Your profile is now pending verification. You will be able to go online once approved.',
                    [{
                        text: 'Continue',
                        onPress: () => {
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'MainTabs' }]
                            });
                        }
                    }]
                );
            } else {
                Alert.alert('Error', response.error || 'Failed to save profile');
            }
        } catch (error) {
            console.error('Setup error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Skip Verification?',
            'You won\'t be able to go online and accept jobs until your documents are verified.',
            [
                { text: 'Complete Setup', style: 'cancel' },
                {
                    text: 'Skip for Now',
                    onPress: () => {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'MainTabs' }]
                        });
                    }
                }
            ]
        );
    };

    const VehicleOption = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.vehicleOption,
                vehicleType === item.type && styles.vehicleOptionSelected
            ]}
            onPress={() => setVehicleType(item.type)}
        >
            <View style={[
                styles.vehicleIconContainer,
                vehicleType === item.type && styles.vehicleIconContainerSelected
            ]}>
                <Ionicons
                    name={item.icon}
                    size={28}
                    color={vehicleType === item.type ? COLORS.white : COLORS.primary}
                />
            </View>
            <Text style={[
                styles.vehicleLabel,
                vehicleType === item.type && styles.vehicleLabelSelected
            ]}>
                {item.label}
            </Text>
            {vehicleType === item.type && (
                <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                </View>
            )}
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
                        <Image source={{ uri: value }} style={styles.documentPreview} />
                        <View style={styles.editBadge}>
                            <Ionicons name="pencil" size={14} color={COLORS.white} />
                        </View>
                    </>
                ) : (
                    <View style={styles.documentPlaceholder}>
                        <Ionicons name="camera" size={28} color={COLORS.muted} />
                        <Text style={styles.documentPlaceholderText}>Tap to upload</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {step === 1 ? 'Vehicle Setup' : 'Upload Documents'}
                </Text>
                {isFirstSetup && (
                    <TouchableOpacity onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                )}
                {!isFirstSetup && <View style={{ width: 40 }} />}
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
                </View>
                <Text style={styles.progressText}>Step {step} of 2</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {step === 1 ? (
                        <>
                            {/* Step 1: Vehicle Selection */}
                            <Text style={styles.stepTitle}>What vehicle do you use?</Text>
                            <Text style={styles.stepSubtitle}>
                                Select your primary delivery vehicle
                            </Text>

                            <View style={styles.vehicleGrid}>
                                {VEHICLE_TYPES.map((item) => (
                                    <VehicleOption key={item.type} item={item} />
                                ))}
                            </View>

                            {vehicleType !== 'bicycle' && (
                                <View style={styles.fieldsSection}>
                                    <Text style={styles.sectionLabel}>VEHICLE DETAILS</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>
                                            Registration Number <Text style={styles.required}>*</Text>
                                        </Text>
                                        <View style={styles.inputContainer}>
                                            <Ionicons name="car" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="e.g. GR 1234-21"
                                                value={vehicleNumber}
                                                onChangeText={setVehicleNumber}
                                                autoCapitalize="characters"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                            <Text style={styles.inputLabel}>Make/Brand</Text>
                                            <View style={styles.inputContainer}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="e.g. Honda"
                                                    value={vehicleMake}
                                                    onChangeText={setVehicleMake}
                                                />
                                            </View>
                                        </View>
                                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                            <Text style={styles.inputLabel}>Color</Text>
                                            <View style={styles.inputContainer}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="e.g. Red"
                                                    value={vehicleColor}
                                                    onChangeText={setVehicleColor}
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    <DocumentUpload
                                        label="Vehicle Photo"
                                        value={vehiclePhoto}
                                        setter={setVehiclePhoto}
                                    />
                                </View>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Step 2: Documents */}
                            <Text style={styles.stepTitle}>Upload your documents</Text>
                            <Text style={styles.stepSubtitle}>
                                We need these to verify your identity
                            </Text>

                            {/* Ghana Card Section */}
                            <View style={styles.docSection}>
                                <Text style={styles.sectionLabel}>GHANA CARD (NIA)</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>
                                        NIA Number <Text style={styles.required}>*</Text>
                                    </Text>
                                    <View style={styles.inputContainer}>
                                        <Ionicons name="card" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. GHA-123456789-0"
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
                                        required
                                    />
                                    <DocumentUpload
                                        label="Back"
                                        value={ghanaCardBack}
                                        setter={setGhanaCardBack}
                                        required
                                    />
                                </View>
                            </View>

                            {/* Driving License Section */}
                            {vehicleType !== 'bicycle' && (
                                <View style={styles.docSection}>
                                    <Text style={styles.sectionLabel}>DRIVING LICENSE</Text>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>
                                            License Number <Text style={styles.required}>*</Text>
                                        </Text>
                                        <View style={styles.inputContainer}>
                                            <Ionicons name="document" size={20} color={COLORS.muted} style={styles.inputIcon} />
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
                                            required
                                        />
                                        <DocumentUpload
                                            label="Back"
                                            value={licenseBack}
                                            setter={setLicenseBack}
                                            required
                                        />
                                    </View>
                                </View>
                            )}

                            <View style={styles.infoBox}>
                                <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                                <Text style={styles.infoText}>
                                    Your documents are encrypted and stored securely. They will only be used for verification.
                                </Text>
                            </View>
                        </>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                {step === 1 ? (
                    <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
                        <Text style={styles.primaryButtonText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.primaryButton, saving && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <>
                                <Text style={styles.primaryButtonText}>Complete Setup</Text>
                                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    skipText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    progressContainer: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    progressBar: {
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: COLORS.muted,
        marginTop: 8,
        textAlign: 'right',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    stepSubtitle: {
        fontSize: 15,
        color: COLORS.muted,
        marginBottom: 24,
    },
    vehicleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    vehicleOption: {
        width: '31%',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    vehicleOptionSelected: {
        borderColor: COLORS.primary,
        backgroundColor: `${COLORS.primary}08`,
    },
    vehicleIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    vehicleIconContainerSelected: {
        backgroundColor: COLORS.primary,
    },
    vehicleLabel: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '500',
        textAlign: 'center',
    },
    vehicleLabelSelected: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    checkBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fieldsSection: {
        marginTop: 8,
    },
    docSection: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.muted,
        letterSpacing: 1,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    required: {
        color: COLORS.error,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
        color: COLORS.text,
    },
    row: {
        flexDirection: 'row',
    },
    documentRow: {
        flexDirection: 'row',
        gap: 12,
    },
    documentContainer: {
        flex: 1,
        marginBottom: 12,
    },
    documentLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    documentPicker: {
        height: 100,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    documentPickerActive: {
        borderStyle: 'solid',
        borderColor: COLORS.primary,
    },
    documentPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentPlaceholderText: {
        fontSize: 11,
        color: COLORS.muted,
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
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${COLORS.primary}10`,
        padding: 14,
        borderRadius: 12,
        gap: 10,
        alignItems: 'flex-start',
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: COLORS.primary,
        lineHeight: 18,
    },
    bottomActions: {
        padding: 16,
        paddingBottom: 32,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});

export default VehicleSetupScreen;
