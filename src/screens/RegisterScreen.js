import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const RegisterScreen = ({ navigation }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [vehicleType, setVehicleType] = useState('motorcycle');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        if (!firstName || !lastName || !email || !phone || !password || !vehicleType) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const data = {
                first_name: firstName,
                last_name: lastName,
                email,
                phone,
                password,
                vehicle_type: vehicleType,
                vehicle_number: vehicleNumber
            };

            const response = await courierApi.register(data);
            if (response.success) {
                Alert.alert(
                    'Success',
                    'Registration successful! Your account is pending approval.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                );
            } else {
                Alert.alert('Registration Failed', response.error || 'Please try again');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred. Please try again.');
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
            ]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>

                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join our delivery team</Text>

                    <View style={styles.form}>
                        <View style={styles.row}>
                            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="First Name"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                            </View>
                            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Last Name"
                                    value={lastName}
                                    onChangeText={setLastName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="call-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone number"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={COLORS.muted}
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Select Vehicle Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                            <VehicleOption type="motorcycle" label="Motorcycle" icon="bicycle" />
                            <VehicleOption type="bicycle" label="Bicycle" icon="bicycle-outline" />
                            <VehicleOption type="car" label="Car" icon="car-outline" />
                            <VehicleOption type="van" label="Van" icon="bus-outline" />
                        </ScrollView>

                        <View style={styles.inputContainer}>
                            <Ionicons name="information-circle-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Vehicle Number Plate (Optional)"
                                value={vehicleNumber}
                                onChangeText={setVehicleNumber}
                                autoCapitalize="characters"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.registerButton, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Register</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
    },
    backButton: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.muted,
        marginBottom: 32,
    },
    form: {
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: COLORS.text,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 8,
        marginBottom: 16,
    },
    vehicleScroll: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    vehicleOption: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        marginRight: 12,
        width: 100,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    vehicleOptionSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    vehicleLabel: {
        marginTop: 8,
        fontSize: 12,
        color: COLORS.text,
        textAlign: 'center',
    },
    vehicleLabelSelected: {
        color: COLORS.white,
        fontWeight: '600',
    },
    registerButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        color: COLORS.muted,
        fontSize: 14,
    },
    loginLink: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default RegisterScreen;
