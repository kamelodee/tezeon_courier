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

const ForgotPasswordScreen = ({ navigation }) => {
    const [step, setStep] = useState('email'); // 'email' or 'otp'
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRequestOTP = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            const response = await courierApi.requestPasswordReset(email);
            if (response.success) {
                setStep('otp');
                Alert.alert('Code Sent', 'Please check your email for the verification code.');
            } else {
                Alert.alert('Error', response.error || 'Failed to send verification code');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndReset = async () => {
        if (!otp.trim() || !newPassword.trim()) {
            Alert.alert('Error', 'Please enter the code and your new password');
            return;
        }

        if (otp.length < 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit code');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            const response = await courierApi.confirmPasswordResetOTP(email, otp, newPassword);
            if (response.success) {
                Alert.alert(
                    'Success',
                    'Your password has been reset successfully. Please login with your new password.',
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                );
            } else {
                Alert.alert('Reset Failed', response.error || 'Invalid code or expired');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name={step === 'email' ? "lock-open-outline" : "shield-checkmark-outline"}
                            size={60}
                            color={COLORS.primary}
                        />
                    </View>

                    <Text style={styles.title}>
                        {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                    </Text>

                    <Text style={styles.subtitle}>
                        {step === 'email'
                            ? "Enter your email address and we'll send you a code to reset your password."
                            : `Enter the code sent to ${email} and set your new password.`}
                    </Text>

                    {step === 'email' ? (
                        /* Step 1: Email Input */
                        <View style={styles.formContainer}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email address"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    autoCorrect={false}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleRequestOTP}
                                disabled={!!loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Send Code</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Step 2: OTP & New Password */
                        <View style={styles.formContainer}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="keypad-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { letterSpacing: 4 }]}
                                    placeholder="----"
                                    value={otp}
                                    onChangeText={setOtp}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    placeholderTextColor={COLORS.border}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="New Password"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
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

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleVerifyAndReset}
                                disabled={!!loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Reset Password</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.resendLink}
                                onPress={() => setStep('email')}
                                disabled={loading}
                            >
                                <Text style={styles.resendText}>Change Email / Resend Code</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
    header: {
        padding: 16,
    },
    backButton: {
        padding: 4,
    },
    content: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 0,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 20
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.muted,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    formContainer: {
        width: '100%',
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
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        height: '100%'
    },
    button: {
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
    resendLink: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10
    },
    resendText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '500'
    }
});

export default ForgotPasswordScreen;
