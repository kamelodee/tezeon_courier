import React, { useState, useEffect, useMemo } from 'react';
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
import courierApi from '../services/courierApi';
import { useTheme } from '../theme/ThemeContext';

const PayoutScreen = ({ navigation, route }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    // The withdrawable amount comes from the server (wallet minus cash you still hold minus requests
    // waiting). It used to be passed in from the Earnings screen as lifetime earnings, which was wrong.
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingInfo, setLoadingInfo] = useState(true);
    const [amount, setAmount] = useState('');
    const [momoNumber, setMomoNumber] = useState('');
    const [momoNetwork, setMomoNetwork] = useState('MTN'); // MTN, Telecel, AirtelTigo
    const [momoName, setMomoName] = useState('');

    const balance = parseFloat(info?.available || 0) || 0;
    const minimum = parseFloat(info?.minimum || 10) || 10;
    const cashHeld = parseFloat(info?.cash_to_remit || 0) || 0;
    const waiting = (info?.requests || []).find(r => r.status === 'requested');

    // the server stores Telecel under its old name
    const toServerNetwork = (n) => (n === 'Telecel' ? 'Vodafone' : n);
    const fromServerNetwork = (n) => (n === 'Vodafone' ? 'Telecel' : n || 'MTN');

    useEffect(() => {
        loadPayoutInfo();
    }, []);

    const loadPayoutInfo = async () => {
        setLoadingInfo(true);
        const response = await courierApi.getPayoutInfo();
        if (response.success) {
            setInfo(response.data);
            const last = response.data?.last_momo;
            if (last) {
                setMomoNumber(prev => prev || last.number);
                setMomoNetwork(fromServerNetwork(last.network));
                setMomoName(prev => prev || last.name || '');
            }
        } else {
            Alert.alert('Could not load your balance', response.error || 'Please try again.');
        }
        setLoadingInfo(false);
    };

    const handleRequestPayout = async () => {
        const payoutAmount = parseFloat(amount);

        if (!payoutAmount || payoutAmount <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (waiting) {
            Alert.alert('Payout already waiting', 'You can ask again once your current request has been paid.');
            return;
        }

        if (payoutAmount > balance) {
            Alert.alert('Insufficient Balance', `You can withdraw up to ₵${balance.toFixed(2)}.`);
            return;
        }

        if (payoutAmount < minimum) {
            Alert.alert('Minimum Amount', `The minimum payout amount is ₵${minimum.toFixed(2)}`);
            return;
        }

        const digits = momoNumber.replace(/\D/g, '');
        if (!/^(0[235]\d{8}|233[235]\d{8})$/.test(digits)) {
            Alert.alert('Check the number', 'Enter a Ghana mobile money number, e.g. 024 123 4567.');
            return;
        }

        Alert.alert(
            'Confirm Payout',
            `Ask Tezeon to send ₵${payoutAmount.toFixed(2)} to ${momoNumber} (${momoNetwork})?`,
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
                                momo_network: toServerNetwork(momoNetwork),
                                momo_name: momoName
                            });

                            if (response.success) {
                                // Honest: a person sends it. No promised time we cannot keep.
                                setAmount('');
                                loadPayoutInfo();
                                Alert.alert(
                                    'Request sent',
                                    'Tezeon will send the money to your MoMo. It shows as Paid here, with the transaction ID, once it has been sent.',
                                    [{ text: 'OK' }]
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
                { backgroundColor: name === 'MTN' ? '#FFCC00' : name === 'Telecel' ? '#E60000' : '#003087' }
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
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
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
                        {loadingInfo
                            ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />
                            : <Text style={styles.balanceAmount}>₵{balance.toFixed(2)}</Text>}
                        {cashHeld > 0 && (
                            <Text style={styles.balanceNote}>
                                Cash you collected (₵{cashHeld.toFixed(2)}) is taken off first.
                            </Text>
                        )}
                    </View>

                    {waiting && (
                        <View style={styles.waitingBox}>
                            <Ionicons name="time-outline" size={20} color={colors.warning || '#F59E0B'} />
                            <Text style={styles.waitingText}>
                                ₵{waiting.amount} to {waiting.network} ••{waiting.number_last4} is waiting to be sent.
                            </Text>
                        </View>
                    )}

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
                                placeholderTextColor={colors.muted}
                            />
                            <TouchableOpacity
                                style={styles.maxButton}
                                onPress={() => setAmount(balance.toFixed(2))}
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
                            <NetworkOption name="AirtelTigo" />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>MoMo Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call" size={20} color={colors.muted} style={styles.inputIcon} />
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
                                <Ionicons name="person" size={20} color={colors.muted} style={styles.inputIcon} />
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
                        <Ionicons name="information-circle" size={20} color={colors.primary} />
                        <Text style={styles.infoText}>
                            Tezeon sends payouts by mobile money. Check the number and name: money sent to a wrong number cannot be taken back.
                        </Text>
                    </View>

                    {(info?.requests || []).length > 0 && (
                        <View style={[styles.section, { marginTop: 24 }]}>
                            <Text style={styles.sectionTitle}>YOUR PAYOUTS</Text>
                            {info.requests.map(r => (
                                <View key={r.id} style={styles.historyRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.historyAmount}>₵{r.amount}</Text>
                                        <Text style={styles.historyMeta}>
                                            {new Date(r.created_at).toLocaleDateString()} · {fromServerNetwork(r.network)} ••{r.number_last4}
                                            {r.reference ? ` · Ref ${r.reference}` : ''}
                                        </Text>
                                        {!!r.note && <Text style={styles.historyMeta}>{r.note}</Text>}
                                    </View>
                                    <Text style={[styles.historyStatus,
                                        r.status === 'paid' && { color: colors.success || '#10B981' },
                                        r.status === 'rejected' && { color: colors.danger || '#EF4444' }]}>
                                        {r.status === 'requested' ? 'Waiting' : r.status === 'paid' ? 'Paid' : 'Rejected'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payoutButton, (loading || !amount || !!waiting) && styles.buttonDisabled]}
                    onPress={handleRequestPayout}
                    disabled={loading || !amount || !!waiting}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <>
                            <Ionicons name="wallet-outline" size={22} color={colors.white} />
                            <Text style={styles.payoutButtonText}>Request Withdrawal</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        backgroundColor: colors.primary,
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.white },

    content: { padding: 20 },

    balanceCard: {
        backgroundColor: colors.white,
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
    balanceLabel: { fontSize: 13, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    balanceAmount: { fontSize: 36, fontWeight: 'bold', color: colors.text, marginTop: 8 },
    balanceNote: { fontSize: 12, color: colors.muted, marginTop: 8, textAlign: 'center' },
    waitingBox: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 24, backgroundColor: '#FEF3C7' },
    waitingText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '600' },
    historyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 8 },
    historyAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
    historyMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
    historyStatus: { fontSize: 13, fontWeight: '700', color: '#B45309' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 16, letterSpacing: 1 },

    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 70,
        borderWidth: 2,
        borderColor: colors.primaryLight,
    },
    currencyPrefix: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginRight: 10 },
    amountInput: { flex: 1, fontSize: 32, fontWeight: 'bold', color: colors.text },
    maxButton: {
        backgroundColor: `${colors.primary}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    maxButtonText: { fontSize: 12, fontWeight: '700', color: colors.primary },

    networksRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    networkOption: {
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    networkOptionSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}05` },
    networkIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    networkLetter: { color: colors.white, fontWeight: 'bold', fontSize: 18 },
    networkName: { fontSize: 11, fontWeight: '600', color: colors.muted },
    networkNameActive: { color: colors.primary },

    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 54,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: colors.text },

    infoBox: {
        flexDirection: 'row',
        backgroundColor: `${colors.primary}10`,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        alignItems: 'flex-start',
    },
    infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 18 },

    footer: {
        padding: 20,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    payoutButton: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    payoutButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});

export default PayoutScreen;
