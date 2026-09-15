import React, { useState, useMemo } from 'react';
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
    ScrollView,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import courierApi from '../services/courierApi';

// The Tezeon wordmark, not the app icon. Two cuts because the mark is dark ink
// on light and reversed on dark — the single asset used before disappeared
// against a dark background.
const WORDMARK_DARK_INK = require('../../assets/tezeon-wordmark.png');
const WORDMARK_LIGHT_INK = require('../../assets/tezeon-wordmark-white.png');

const LoginScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const isDark = theme_hook?.isDark ?? false;
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    // 'courier' = freelance / 'employee' = staff delivery person
    const [loginMode, setLoginMode] = useState('courier');

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const response = await courierApi.login(email, password);
            if (response.success) {
                // Check if user has a courier profile
                const profile = await courierApi.getProfile();
                if (profile.success) {
                    const profileData = profile.data;

                    // Employee delivery persons assigned by a seller skip the
                    // document-upload gate — their profile is pre-verified.
                    const isEmployeeCourier = !!profileData.employer_name;

                    // Check if profile needs setup (no vehicle or no documents)
                    const needsVehicleSetup = !profileData.vehicle_type;
                    const needsDocuments =
                        !isEmployeeCourier &&
                        (!profileData.ghana_card_number || !profileData.ghana_card_photo);

                    if (needsVehicleSetup || needsDocuments) {
                        navigation.reset({
                            index: 0,
                            routes: [{
                                name: 'VehicleSetup',
                                params: { isFirstSetup: true, profile: profileData }
                            }]
                        });
                    } else {
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'MainTabs' }]
                        });
                    }
                } else {
                    await courierApi.logout();
                    // Distinguish between "no profile yet" vs other errors
                    if (profile.error?.includes('assign you as a delivery person') ||
                        profile.error?.includes('NO_COURIER_PROFILE')) {
                        Alert.alert(
                            'Not Assigned',
                            'Your employer has not assigned you as a delivery person yet. Please ask your employer to assign you in their seller app before signing in here.'
                        );
                    } else {
                        Alert.alert(
                            'Access Denied',
                            'This account is not set up as a courier. If you are an employee, ask your employer to assign you as a delivery person first.'
                        );
                    }
                }
            } else {
                Alert.alert('Login Failed', response.error || 'Invalid email or password');
            }
        } catch (error) {
            Alert.alert('Error', 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isEmployee = loginMode === 'employee';

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Brand lockup */}
                    <View style={styles.header}>
                        <Image
                            source={isDark ? WORDMARK_LIGHT_INK : WORDMARK_DARK_INK}
                            style={styles.wordmark}
                            resizeMode="contain"
                            accessibilityRole="image"
                            accessibilityLabel="Tezeon"
                        />
                        <View style={styles.productBadge}>
                            <Ionicons name="bicycle" size={13} color={colors.primary} />
                            <Text style={styles.productBadgeText}>COURIER</Text>
                        </View>
                        <Text style={styles.subtitle}>
                            {isEmployee ? 'Staff delivery sign in' : 'Deliver with us'}
                        </Text>
                    </View>

                    {/* Mode tabs */}
                    <View style={styles.modeTabs}>
                        <TouchableOpacity
                            style={[styles.modeTab, !isEmployee && styles.modeTabActive]}
                            onPress={() => setLoginMode('courier')}
                            accessibilityRole="button"
                            accessibilityState={{ selected: !isEmployee }}
                        >
                            <Ionicons name="bicycle-outline" size={16} color={!isEmployee ? colors.white : colors.muted} />
                            <Text style={[styles.modeTabText, !isEmployee && styles.modeTabTextActive]}>
                                Courier
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeTab, isEmployee && styles.modeTabActive]}
                            onPress={() => setLoginMode('employee')}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isEmployee }}
                        >
                            <Ionicons name="business-outline" size={16} color={isEmployee ? colors.white : colors.muted} />
                            <Text style={[styles.modeTabText, isEmployee && styles.modeTabTextActive]}>
                                Staff / Employee
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Contextual hint for employees */}
                    {isEmployee && (
                        <View style={styles.employeeHint}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                            <Text style={styles.employeeHintText}>
                                Sign in with the credentials your employer sent you. You must be assigned as a delivery person first.
                            </Text>
                        </View>
                    )}

                    {/* Login Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                // Without this the placeholder renders in the OS
                                // default near-black, which is invisible on the
                                // dark theme's input background.
                                placeholderTextColor={colors.muted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                // autoComplete="off" used to be set here, which
                                // tells the keyboard and password managers to
                                // stay out of a sign-in form — riders were left
                                // typing credentials by hand every time.
                                autoComplete="email"
                                textContentType="username"
                                returnKeyType="next"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={colors.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor={colors.muted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="current-password"
                                textContentType="password"
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                accessibilityRole="button"
                                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                // A 20px icon is below the 44px minimum touch
                                // target, and this one sits at the screen edge.
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.muted}
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={!!loading}
                            accessibilityRole="button"
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.forgotButton}
                            onPress={() => navigation.navigate('ForgotPassword')}
                            accessibilityRole="button"
                        >
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Register link — only shown for freelance courier mode */}
                    {!isEmployee && (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Don't have an account? </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Register')}
                                accessibilityRole="button"
                            >
                                <Text style={styles.registerLink}>Register as Courier</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        // Was COLORS.white, which stays #FFFFFF in the dark palette too — the
        // sign-in screen ignored dark mode entirely.
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    wordmark: {
        // Source art is 2808x630 (4.46:1); matching that ratio keeps `contain`
        // from letterboxing the mark inside its own box.
        width: 208,
        height: 47,
        marginBottom: 12,
    },
    productBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: `${colors.primary}14`,
        borderWidth: 1,
        borderColor: `${colors.primary}33`,
        marginBottom: 10,
    },
    productBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: colors.primary,
    },
    subtitle: {
        fontSize: 16,
        color: colors.muted,
    },
    form: {
        marginBottom: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card ?? colors.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 16,
        color: colors.text,
    },
    loginButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    forgotButton: {
        alignItems: 'center',
        marginTop: 16,
    },
    forgotText: {
        color: colors.primary,
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: colors.muted,
        fontSize: 14,
    },
    registerLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    modeTabs: {
        flexDirection: 'row',
        backgroundColor: colors.card ?? colors.background,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modeTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    modeTabActive: {
        backgroundColor: colors.primary,
    },
    modeTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.muted,
    },
    modeTabTextActive: {
        color: colors.white,
    },
    employeeHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${colors.primary}10`,
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        gap: 8,
        borderWidth: 1,
        borderColor: `${colors.primary}20`,
    },
    employeeHintText: {
        flex: 1,
        fontSize: 13,
        color: colors.primary,
        lineHeight: 18,
    },
});

export default LoginScreen;
