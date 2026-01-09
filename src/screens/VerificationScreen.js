import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const VerificationScreen = ({ navigation, route }) => {
    const [profile, setProfile] = useState(route.params?.profile || null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form fields
    const [ghanaCardNumber, setGhanaCardNumber] = useState(profile?.ghana_card_number || '');
    const [ghanaCardPhoto, setGhanaCardPhoto] = useState(profile?.ghana_card_photo || null);
    const [licenseNumber, setLicenseNumber] = useState(profile?.license_number || '');
    const [licensePhoto, setLicensePhoto] = useState(profile?.driving_license_photo || null);

    useEffect(() => {
        if (!profile) {
            loadProfile();
        }
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await courierApi.getProfile();
            if (response.success) {
                setProfile(response.data);
                setGhanaCardNumber(response.data.ghana_card_number || '');
                setGhanaCardPhoto(response.data.ghana_card_photo || null);
                setLicenseNumber(response.data.license_number || '');
                setLicensePhoto(response.data.driving_license_photo || null);
            }
        } catch (error) {
            console.error('Load profile error:', error);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (setter) => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setter(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!ghanaCardNumber.trim()) {
            Alert.alert('Required', 'Please enter your Ghana Card NIA number');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('ghana_card_number', ghanaCardNumber);
            formData.append('license_number', licenseNumber);

            if (ghanaCardPhoto && !ghanaCardPhoto.startsWith('http')) {
                const filename = ghanaCardPhoto.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('ghana_card_photo', { uri: ghanaCardPhoto, name: filename, type });
            }

            if (licensePhoto && !licensePhoto.startsWith('http')) {
                const filename = licensePhoto.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('driving_license_photo', { uri: licensePhoto, name: filename, type });
            }

            const response = await courierApi.updateProfileWithDocuments(formData);
            if (response.success) {
                Alert.alert('Success', 'Verification documents uploaded successfully. Our team will review them shortly.', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.error || 'Failed to upload documents');
            }
        } catch (error) {
            console.error('Upload documentation error:', error);
            Alert.alert('Error', 'An unexpected error occurred during upload.');
        } finally {
            setUploading(false);
        }
    };

    const DocumentPicker = ({ label, value, setter, icon = "camera" }) => (
        <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>{label}</Text>
            <TouchableOpacity
                style={[styles.imagePicker, value && styles.imagePickerActive]}
                onPress={() => pickImage(setter)}
            >
                {value ? (
                    <Image source={{ uri: value.startsWith('http') ? value : value }} style={styles.previewImage} />
                ) : (
                    <View style={styles.pickerPlaceholder}>
                        <Ionicons name={icon} size={32} color={COLORS.muted} />
                        <Text style={styles.pickerText}>Click to upload photo</Text>
                    </View>
                )}
                {value && (
                    <View style={styles.editOverlay}>
                        <Ionicons name="pencil" size={20} color={COLORS.white} />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    if (loading && !profile) {
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account Verification</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.infoBox}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.infoText}>
                            To comply with local regulations and ensure community safety, we require verification of your identity and driving credentials.
                        </Text>
                    </View>

                    <View style={[styles.section, { borderTopWidth: 0 }]}>
                        <Text style={styles.sectionTitle}>GHANA CARD (REQUIRED)</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>NIA Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="card-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. GHA-123456789-0"
                                    value={ghanaCardNumber}
                                    onChangeText={setGhanaCardNumber}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                        <DocumentPicker
                            label="Front of Ghana Card"
                            value={ghanaCardPhoto}
                            setter={setGhanaCardPhoto}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DRIVING LICENSE (IF APPLICABLE)</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>License Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="car-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Driving license number"
                                    value={licenseNumber}
                                    onChangeText={setLicenseNumber}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                        <DocumentPicker
                            label="License Photo"
                            value={licensePhoto}
                            setter={setLicensePhoto}
                        />
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.saveButton, uploading && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.saveButtonText}>Submit for Review</Text>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.disclaimer}>
                            Your data is stored securely and only used for verification purposes.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.white },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.primary,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
    content: { flex: 1 },
    scrollContent: { padding: 20 },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${COLORS.primary}10`,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
        gap: 12,
    },
    infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18, fontWeight: '500' },
    section: { marginBottom: 32, paddingTop: 10 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.muted, marginBottom: 20, letterSpacing: 1 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, paddingVertical: 14, fontSize: 15, color: COLORS.text },
    pickerContainer: { marginBottom: 12 },
    pickerLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
    imagePicker: {
        width: '100%',
        height: 180,
        backgroundColor: COLORS.background,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    imagePickerActive: { borderStyle: 'solid', borderColor: COLORS.primary },
    pickerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
    pickerText: { fontSize: 14, color: COLORS.muted },
    previewImage: { width: '100%', height: '100%' },
    editOverlay: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: { marginTop: 10, paddingBottom: 40 },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    disabledButton: { opacity: 0.7 },
    saveButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
    disclaimer: {
        textAlign: 'center',
        color: COLORS.muted,
        fontSize: 12,
        marginTop: 16,
        lineHeight: 18,
    },
});

export default VerificationScreen;
