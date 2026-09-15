import React, { useState, useEffect, useMemo } from 'react';
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
import courierApi from '../services/courierApi';
import { useTheme } from '../theme/ThemeContext';

const VerificationScreen = ({ navigation, route }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [profile, setProfile] = useState(route.params?.profile || null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form fields
    const [ghanaCardNumber, setGhanaCardNumber] = useState(profile?.ghana_card_number || '');
    const [ghanaCardPhoto, setGhanaCardPhoto] = useState(profile?.ghana_card_photo || null);
    const [ghanaCardBackPhoto, setGhanaCardBackPhoto] = useState(profile?.id_card_photo || null); // Back of ID

    const [licenseNumber, setLicenseNumber] = useState(profile?.license_number || '');
    const [licensePhoto, setLicensePhoto] = useState(profile?.driving_license_photo || null);
    const [licenseBackPhoto, setLicenseBackPhoto] = useState(profile?.driving_license_back_photo || null); // Back of License

    useEffect(() => {
        if (!profile) {
            loadProfile();
        } else {
            // Ensure local state syncs with passed profile if needed
            setGhanaCardNumber(profile.ghana_card_number || '');
            setGhanaCardPhoto(profile.ghana_card_photo || null);
            setGhanaCardBackPhoto(profile.id_card_photo || null);
            setLicenseNumber(profile.license_number || '');
            setLicensePhoto(profile.driving_license_photo || null);
            setLicenseBackPhoto(profile.driving_license_back_photo || null);
        }
    }, [profile]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const response = await courierApi.getProfile();
            if (response.success) {
                setProfile(response.data);
                // State will update via effect
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
            mediaTypes: ['images'],
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

        if (!ghanaCardPhoto) {
            Alert.alert('Required', 'Please upload the front of your Ghana Card');
            return;
        }

        if (!ghanaCardBackPhoto) {
            Alert.alert('Required', 'Please upload the back of your Ghana Card');
            return;
        }

        if (licenseNumber.trim() && (!licensePhoto || !licenseBackPhoto)) {
            Alert.alert('Incomplete', 'If providing a driving license, please upload both front and back photos.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('ghana_card_number', ghanaCardNumber);
            formData.append('license_number', licenseNumber);

            // Helper to append image
            const appendImage = (key, uri) => {
                if (uri && !uri.startsWith('http')) {
                    const filename = uri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;
                    formData.append(key, { uri: uri, name: filename, type });
                }
            };

            appendImage('ghana_card_photo', ghanaCardPhoto);
            appendImage('id_card_photo', ghanaCardBackPhoto); // Backend field for ID Back
            appendImage('driving_license_photo', licensePhoto);
            appendImage('driving_license_back_photo', licenseBackPhoto);

            const response = await courierApi.updateProfileWithDocuments(formData);
            if (response.success) {
                Alert.alert(
                    'Success',
                    'Verification documents uploaded successfully. Your account is pending admin approval.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
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
                        <Ionicons name={icon} size={32} color={colors.muted} />
                        <Text style={styles.pickerText}>Click to upload</Text>
                    </View>
                )}
                {value && (
                    <View style={styles.editOverlay}>
                        <Ionicons name="pencil" size={20} color={colors.white} />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    if (loading && !profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
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
                        <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
                        <Text style={styles.infoText}>
                            To go online, please upload clear photos of your ID and License.
                        </Text>
                    </View>

                    {/* Ghana Card Section */}
                    <View style={[styles.section, { borderTopWidth: 0 }]}>
                        <Text style={styles.sectionTitle}>GHANA CARD (REQUIRED)</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>NIA Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="card-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. GHA-123456789-0"
                                    value={ghanaCardNumber}
                                    onChangeText={setGhanaCardNumber}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <DocumentPicker
                                    label="Front View"
                                    value={ghanaCardPhoto}
                                    setter={setGhanaCardPhoto}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <DocumentPicker
                                    label="Back View"
                                    value={ghanaCardBackPhoto}
                                    setter={setGhanaCardBackPhoto}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Driving License Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>DRIVING LICENSE (IF APPLICABLE)</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>License Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="car-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Driving license number"
                                    value={licenseNumber}
                                    onChangeText={setLicenseNumber}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                        <View style={styles.row}>
                            <View style={styles.halfWidth}>
                                <DocumentPicker
                                    label="Front View"
                                    value={licensePhoto}
                                    setter={setLicensePhoto}
                                />
                            </View>
                            <View style={styles.halfWidth}>
                                <DocumentPicker
                                    label="Back View"
                                    value={licenseBackPhoto}
                                    setter={setLicenseBackPhoto}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.saveButton, uploading && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <ActivityIndicator color={colors.white} />
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

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.primary,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.white },
    content: { flex: 1 },
    scrollContent: { padding: 20 },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${colors.primary}10`,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        alignItems: 'center',
        gap: 12,
    },
    infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18, fontWeight: '500' },
    section: { marginBottom: 32, paddingTop: 10 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', color: colors.muted, marginBottom: 20, letterSpacing: 1 },
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },

    // Grid layout for photos
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12
    },
    halfWidth: {
        flex: 1
    },

    pickerContainer: { marginBottom: 12 },
    pickerLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
    imagePicker: {
        width: '100%',
        height: 120, // Slightly smaller since we have two side-by-side
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    imagePickerActive: { borderStyle: 'solid', borderColor: colors.primary },
    pickerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
    pickerText: { fontSize: 12, color: colors.muted },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    editOverlay: {
        position: 'absolute',
        right: 8,
        bottom: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: { marginTop: 10, paddingBottom: 40 },
    saveButton: {
        backgroundColor: colors.primary,
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
    saveButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
    disclaimer: {
        textAlign: 'center',
        color: colors.muted,
        fontSize: 12,
        marginTop: 16,
        lineHeight: 18,
    },
});

export default VerificationScreen;
