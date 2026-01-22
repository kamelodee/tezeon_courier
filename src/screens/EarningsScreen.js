import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Alert,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const EarningsScreen = ({ navigation }) => {
    const [summary, setSummary] = useState(null);
    const [earnings, setEarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const mockChartData = [
        { label: 'M', value: 45 },
        { label: 'T', value: 78 },
        { label: 'W', value: 52 },
        { label: 'T', value: 95 },
        { label: 'F', value: 120 },
        { label: 'S', value: 156 },
        { label: 'S', value: 88 },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const PerformanceChart = ({ data }) => {
        const maxValue = Math.max(...data.map(d => d.value), 10);

        return (
            <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>Weekly Performance</Text>
                    <Ionicons name="trending-up" size={16} color={COLORS.success} />
                </View>
                <View style={styles.chartContent}>
                    {data.map((day, index) => (
                        <View key={index} style={styles.chartBarContainer}>
                            <View style={styles.barBackground}>
                                <View
                                    style={[
                                        styles.barActive,
                                        { height: `${(day.value / maxValue) * 100}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.barLabel}>{day.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const loadData = async () => {
        try {
            const [summaryRes, earningsRes] = await Promise.all([
                courierApi.getEarningsSummary(),
                courierApi.getEarnings()
            ]);

            if (summaryRes.success) {
                setSummary(summaryRes.data);
            }
            if (earningsRes.success) {
                setEarnings(Array.isArray(earningsRes.data) ? earningsRes.data : []);
            }
        } catch (error) {
            console.error('Load earnings error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const handleSubscribe = () => {
        Alert.alert(
            'Confirm Subscription',
            'Upgrade to Premium for ₵50/month to access Marketplace jobs? This amount will be deducted from your earnings or billed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const response = await courierApi.subscribe();
                            if (response.success) {
                                Alert.alert('Success', 'Welcome to Premium! You can now access marketplace jobs.');
                                loadData(); // Refresh to see active status
                            } else {
                                Alert.alert('Error', response.error || 'Failed to subscribe');
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

    const getTypeIcon = (type) => {
        const icons = {
            delivery: 'bicycle',
            tip: 'gift',
            bonus: 'star',
            payout: 'wallet',
            deduction: 'remove-circle'
        };
        return icons[type] || 'cash';
    };

    const getTypeColor = (type) => {
        const colors = {
            delivery: COLORS.primary,
            tip: COLORS.success,
            bonus: COLORS.warning,
            payout: COLORS.muted,
            deduction: COLORS.error
        };
        return colors[type] || COLORS.text;
    };

    const renderEarning = ({ item }) => (
        <View style={styles.earningCard}>
            <View style={[styles.earningIcon, { backgroundColor: `${getTypeColor(item.type)}15` }]}>
                <Ionicons name={getTypeIcon(item.type)} size={20} color={getTypeColor(item.type)} />
            </View>
            <View style={styles.earningInfo}>
                <Text style={styles.earningType}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
                <Text style={styles.earningDesc}>{item.description || item.order_number || '-'}</Text>
                <Text style={styles.earningDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.earningAmount}>
                <Text style={[
                    styles.amountText,
                    { color: item.type === 'deduction' || item.type === 'payout' ? COLORS.error : COLORS.success }
                ]}>
                    {item.type === 'deduction' || item.type === 'payout' ? '-' : '+'}₵{parseFloat(item.amount).toFixed(2)}
                </Text>
                {!!item.is_paid && (
                    <View style={styles.paidBadge}>
                        <Text style={styles.paidText}>Paid</Text>
                    </View>
                )}
            </View>
        </View>
    );

    if (loading) {
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
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Earnings</Text>
                    <Text style={styles.headerSubtitle}>Track your revenue</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="wallet" size={24} color={COLORS.primary} />
                </View>
            </View>

            <FlatList
                data={earnings}
                renderItem={renderEarning}
                keyExtractor={(item) => item.id?.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
                ListHeaderComponent={
                    <View>
                        {/* Summary Card */}
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryMain}>
                                <Text style={styles.summaryLabel}>Total Earnings</Text>
                                <Text style={styles.summaryAmount}>
                                    ₵{parseFloat(summary?.total || 0).toFixed(2)}
                                </Text>
                                <TouchableOpacity
                                    style={styles.cashOutButton}
                                    onPress={() => navigation.navigate('Payout', { balance: summary?.total || 0 })}
                                >
                                    <Text style={styles.cashOutButtonText}>Cash Out Now</Text>
                                    <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.summaryGrid}>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.itemLabel}>Today</Text>
                                    <Text style={styles.itemValue}>₵{parseFloat(summary?.today || 0).toFixed(2)}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.itemLabel}>This Week</Text>
                                    <Text style={styles.itemValue}>₵{parseFloat(summary?.this_week || 0).toFixed(2)}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.itemLabel}>This Month</Text>
                                    <Text style={styles.itemValue}>₵{parseFloat(summary?.this_month || 0).toFixed(2)}</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={styles.itemLabel}>Pending Payout</Text>
                                    <Text style={[styles.itemValue, { color: '#FFD700' }]}>
                                        ₵{parseFloat(summary?.pending_payout || 0).toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Performance Chart */}
                        <PerformanceChart data={mockChartData} />

                        {/* Cash Collection / Debt Card */}
                        {parseFloat(summary?.cash_collected || 0) > 0 && (
                            <View style={styles.debtCard}>
                                <View style={styles.debtHeader}>
                                    <View>
                                        <Text style={styles.debtLabel}>Cash Collected (To Remit)</Text>
                                        <Text style={styles.debtAmount}>-₵{parseFloat(summary?.cash_collected).toFixed(2)}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.remitButton}
                                        onPress={() => Alert.alert('Remit Cash', 'Mobile Money payment integration coming soon.')}
                                    >
                                        <Text style={styles.remitText}>Remit Now</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.debtNote}>
                                    You have collected ₵{parseFloat(summary?.cash_collected).toFixed(2)} in cash.
                                    Please remit this to the platform to avoid being blocked from new jobs.
                                </Text>
                            </View>
                        )}

                        {/* Subscription Card */}
                        <View style={styles.subscriptionCard}>
                            <View style={styles.subHeader}>
                                <View style={styles.subTitleRow}>
                                    <Ionicons name="diamond" size={24} color={summary?.is_premium ? COLORS.white : '#FFD700'} />
                                    <View>
                                        <Text style={styles.subTitle}>Premium Access</Text>
                                        <Text style={styles.subStatus}>
                                            {summary?.is_premium
                                                ? `Active until ${new Date(summary.subscription_expiry).toLocaleDateString()}`
                                                : 'Unlock Marketplace Jobs'}
                                        </Text>
                                    </View>
                                </View>
                                {summary?.is_premium ? (
                                    <View style={styles.activeBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                                        <Text style={styles.activeText}>Active</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.upgradeButton}
                                        onPress={handleSubscribe}
                                    >
                                        <Text style={styles.upgradeText}>Upgrade - ₵50/mo</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Transaction History</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="wallet-outline" size={64} color={COLORS.muted} />
                        <Text style={styles.emptyTitle}>No Earnings Yet</Text>
                        <Text style={styles.emptyText}>Complete deliveries to start earning</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: COLORS.white,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    headerSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${COLORS.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },

    listContent: { padding: 16 },

    summaryCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        elevation: 8,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    summaryMain: { alignItems: 'center', marginBottom: 24 },
    summaryLabel: { fontSize: 13, color: COLORS.white, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 },
    summaryAmount: { fontSize: 40, fontWeight: 'bold', color: COLORS.white, marginTop: 8 },
    cashOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 16,
        gap: 8,
    },
    cashOutButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    summaryItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
    },
    itemLabel: { fontSize: 12, color: COLORS.white, opacity: 0.8 },
    itemValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },

    earningCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    earningIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    earningInfo: { flex: 1, marginLeft: 12 },
    earningType: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    earningDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    earningDate: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
    earningAmount: { alignItems: 'flex-end' },
    amountText: { fontSize: 16, fontWeight: 'bold' },
    paidBadge: { backgroundColor: `${COLORS.success}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    paidText: { fontSize: 10, fontWeight: '600', color: COLORS.success },

    emptyText: { fontSize: 14, color: COLORS.muted, marginTop: 8 },

    // Chart Styles
    chartCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    chartContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        paddingHorizontal: 10,
    },
    chartBarContainer: {
        alignItems: 'center',
        flex: 1,
    },
    barBackground: {
        width: 16,
        height: 100,
        backgroundColor: `${COLORS.primary}10`,
        borderRadius: 6,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barActive: {
        width: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 6,
    },
    barLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.muted,
        marginTop: 8,
    },

    // Subscription Styles
    subscriptionCard: {
        backgroundColor: '#2D3436',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)', // Subtle gold border
    },
    subHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subTitleRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginRight: 8,
    },
    subTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    subStatus: {
        fontSize: 12,
        color: '#A0A0B0',
        marginTop: 2,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    activeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    upgradeButton: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    upgradeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
    },

    // Debt / Cash Styles
    debtCard: {
        backgroundColor: '#FFE5E5',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.error,
    },
    debtHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    debtLabel: {
        fontSize: 12,
        color: COLORS.error,
        fontWeight: '600',
    },
    debtAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.error,
    },
    debtNote: {
        fontSize: 12,
        color: '#666',
        lineHeight: 18,
    },
    remitButton: {
        backgroundColor: COLORS.error,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    remitText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.white,
    },
});

export default EarningsScreen;
