import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import courierApi from '../services/courierApi';

const EarningsScreen = () => {
    const [summary, setSummary] = useState(null);
    const [earnings, setEarnings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

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
                <Text style={styles.headerTitle}>Earnings</Text>
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
                                    <Text style={[styles.itemValue, { color: COLORS.warning }]}>
                                        ₵{parseFloat(summary?.pending_payout || 0).toFixed(2)}
                                    </Text>
                                </View>
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
        backgroundColor: COLORS.primary,
        padding: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },

    listContent: { padding: 16 },

    summaryCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    summaryMain: { alignItems: 'center', marginBottom: 20 },
    summaryLabel: { fontSize: 14, color: COLORS.white, opacity: 0.8 },
    summaryAmount: { fontSize: 36, fontWeight: 'bold', color: COLORS.white, marginTop: 8 },
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

    emptyState: { alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16 },
    emptyText: { fontSize: 14, color: COLORS.muted, marginTop: 8 },
});

export default EarningsScreen;
