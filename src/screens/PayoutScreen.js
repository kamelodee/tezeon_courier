import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const PayoutScreen = ({ navigation, route }) => {
    const { balance = 0 } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [momoNumber, setMomoNumber] = useState('');
    const [momoNetwork, setMomoNetwork] = useState('MTN'); // MTN, Vodafone, AirtelTigo
    const [momoName, setMomoName] = useState('');

    const [savedMomo, setSavedMomo] = useState(null);

    useEffect(() => {
        loadPayoutSettings();
    }, []);

    const loadPayoutSettings = async () => {
        setLoading(true);
        try {
            // In a real app, we'd fetch saved payout methods
            const response = await courierApi.getProfile();
            if (response.success && response.data.momo_number) {
                setSavedMomo({
                    number: response.data.momo_number,
                    network: response.data.momo_network || 'MTN',
                    name: response.data.momo_name || ''
                });
                setMomoNumber(response.data.momo_number);
                setMomoNetwork(response.data.momo_network || 'MTN');
                setMomoName(response.data.momo_name || '');
            }
        } catch (error) {
            console.error('Load payout settings error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async () => {
        const payoutAmount = parseFloat(amount);

        if (!payoutAmount || payoutAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (payoutAmount > balance) {
            Alert.alert('Insufficient Balance', `You only have ₵${balance.toFixed(2)} available.`);
            return;
        }

        if (payoutAmount < 10) {
            Alert.alert('Minimum Amount', 'The minimum payout amount is ₵10.00');
            return;
        }

        if (!momoNumber || momoNumber.length < 10) {
            Alert.alert('Error', 'Please enter a valid Mobile Money number');
            return;
        }

        Alert.alert(
            'Confirm Payout',
            `Are you sure you want to withdraw ₵${payoutAmount.toFixed(2)} to ${momoNumber} (${momoNetwork})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Withdraw Now',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const response = await courierApi.requestPayout({
                                amount: payoutAmount,
                                momo_number: momoNumber,
                                momo_network: momoNetwork,
                                momo_name: momoName
                            });

                            if (response.success) {
                                Alert.alert(
                                    'Success!',
                                    'Your payout request has been received and is being processed. Funds usually arrive within 24 hours.',
                                    [{ text: 'Great', onPress: () => navigation.goBack() }]
                                );
                            } else {
                                Alert.alert('Request Failed', response.error || 'Something went wrong');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'An unexpected error occurred');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const NetworkOption = ({ name, icon }) => (
        <TouchableOpacity
            style={[
                styles.networkOption,
                momoNetwork === name && styles.networkOptionSelected
            ]}
            onPress={() => setMomoNetwork(name)}
        >
            <View style={[
                styles.networkIcon,
                { backgroundColor: name === 'MTN' ? '#FFCC00' : name === 'Telecel' ? '#E60000' : '#00AEEF' }
            ]}>
                <Text style={styles.networkLetter}>{name.charAt(0)}</Text>
            </View>
            <Text style={[styles.networkName, momoNetwork === name && styles.networkNameActive]}>{name}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cash Out</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Balance Banner */}
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Available for Cashout</Text>
                        <Text style={styles.balanceAmount}>₵{parseFloat(balance).toFixed(2)}</Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>WITHDRAWAL AMOUNT</Text>
                        <View style={styles.amountInputContainer}>
                            <Text style={styles.currencyPrefix}>₵</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                placeholderTextColor={COLORS.muted}
                            />
                            <TouchableOpacity
                                style={styles.maxButton}
                                onPress={() => setAmount(balance.toString())}
                            >
                                <Text style={styles.maxButtonText}>MAX</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>MOBILE MONEY DETAILS</Text>

                        <View style={styles.networksRow}>
                            <NetworkOption name="MTN" />
                            <NetworkOption name="Telecel" />
                            <NetworkOption name="AT" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>MoMo Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="024 000 0000"
                                    value={momoNumber}
                                    onChangeText={setMomoNumber}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Account Name (Optional)</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person" size={20} color={COLORS.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Account Holder Name"
                                    value={momoName}
                                    onChangeText={setMomoName}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.infoText}>
                            Payouts are processed daily. Please ensure your MoMo details are correct to avoid delays.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payoutButton, (loading || !amount) && styles.buttonDisabled]}
                    onPress={handleRequestPayout}
                    disabled={loading || !amount}
                >
                    {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                    ) : (
                        <>
                            <Ionicons name="wallet-outline" size={22} color={COLORS.white} />
                            <Text style={styles.payoutButtonText}>Request Withdrawal</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
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

    balanceCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    balanceLabel: { fontSize: 13, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    balanceAmount: { fontSize: 36, fontWeight: 'bold', color: COLORS.text, marginTop: 8 },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 16, letterSpacing: 1 },

    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 70,
        borderWidth: 2,
        borderColor: COLORS.primaryLight,
    },
    currencyPrefix: { fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginRight: 10 },
    amountInput: { flex: 1, fontSize: 32, fontWeight: 'bold', color: COLORS.text },
    maxButton: {
        backgroundColor: `${COLORS.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    maxButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

    networksRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    networkOption: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    networkOptionSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}05` },
    networkIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    networkLetter: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
    networkName: { fontSize: 11, fontWeight: '600', color: COLORS.muted },
    networkNameActive: { color: COLORS.primary },

    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 54,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: COLORS.text },

    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${COLORS.primary}10`,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18 },

    footer: {
        padding: 20,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    payoutButton: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        elevation: 4,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    payoutButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});

export default PayoutScreen;
