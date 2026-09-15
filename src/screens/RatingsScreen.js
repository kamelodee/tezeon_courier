import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import courierApi from '../services/courierApi';
import { useTheme } from '../theme/ThemeContext';

const RatingsScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [ratings, setRatings] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadRatings();
    }, []);

    const loadRatings = async () => {
        try {
            const response = await courierApi.getRatings();
            if (response.success) {
                setRatings(response.data.ratings || []);
                setSummary(response.data.summary || {
                    average: 5.0,
                    total: 0,
                    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                });
            }
        } catch (error) {
            console.error('Load ratings error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadRatings();
    }, []);

    const renderStars = (rating, size = 14) => (
        <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                    key={star}
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={size}
                    color={star <= rating ? colors.warning : colors.muted}
                />
            ))}
        </View>
    );

    const renderDistributionBar = (count, total, starCount) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
            <View style={styles.distributionRow}>
                <Text style={styles.distributionLabel}>{starCount}</Text>
                <Ionicons name="star" size={12} color={colors.warning} />
                <View style={styles.distributionBarBg}>
                    <View style={[styles.distributionBarFill, { width: `${percentage}%` }]} />
                </View>
                <Text style={styles.distributionCount}>{count}</Text>
            </View>
        );
    };

    const renderRating = ({ item }) => (
        <View style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
                <View style={styles.customerInfo}>
                    <View style={styles.customerAvatar}>
                        <Text style={styles.avatarText}>
                            {item.customer_name?.charAt(0) || 'C'}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.customerName}>{item.customer_name || 'Customer'}</Text>
                        <Text style={styles.ratingDate}>
                            {new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                    </View>
                </View>
                {renderStars(item.rating, 16)}
            </View>
            {item.comment && (
                <Text style={styles.ratingComment}>"{item.comment}"</Text>
            )}
            {item.delivery_id && (
                <View style={styles.deliveryRef}>
                    <Ionicons name="cube-outline" size={14} color={colors.muted} />
                    <Text style={styles.deliveryRefText}>Order #{item.delivery_id.slice(-8)}</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
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
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Ratings</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={ratings}
                renderItem={renderRating}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListHeaderComponent={
                    <View>
                        {/* Summary Card */}
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryLeft}>
                                <Text style={styles.averageRating}>
                                    {parseFloat(summary?.average || 5).toFixed(1)}
                                </Text>
                                {renderStars(Math.round(summary?.average || 5), 20)}
                                <Text style={styles.totalRatings}>
                                    {summary?.total || 0} reviews
                                </Text>
                            </View>
                            <View style={styles.summaryRight}>
                                {[5, 4, 3, 2, 1].map((star) => (
                                    renderDistributionBar(
                                        summary?.distribution?.[star] || 0,
                                        summary?.total || 0,
                                        star
                                    )
                                ))}
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Recent Reviews</Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="star-outline" size={64} color={colors.muted} />
                        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
                        <Text style={styles.emptyText}>
                            Complete deliveries to receive customer reviews
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 16,
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
        color: colors.white,
    },
    listContent: {
        padding: 16,
    },
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    summaryLeft: {
        alignItems: 'center',
        paddingRight: 20,
        borderRightWidth: 1,
        borderRightColor: colors.border,
    },
    averageRating: {
        fontSize: 48,
        fontWeight: 'bold',
        color: colors.text,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 2,
        marginTop: 4,
    },
    totalRatings: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 4,
    },
    summaryRight: {
        flex: 1,
        paddingLeft: 20,
        justifyContent: 'center',
    },
    distributionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    distributionLabel: {
        fontSize: 12,
        color: colors.text,
        width: 12,
    },
    distributionBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: colors.border,
        borderRadius: 3,
        marginHorizontal: 8,
    },
    distributionBarFill: {
        height: '100%',
        backgroundColor: colors.warning,
        borderRadius: 3,
    },
    distributionCount: {
        fontSize: 11,
        color: colors.muted,
        width: 24,
        textAlign: 'right',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
    },
    ratingCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    ratingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.white,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    ratingDate: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 2,
    },
    ratingComment: {
        fontSize: 14,
        color: colors.text,
        fontStyle: 'italic',
        marginTop: 12,
        lineHeight: 20,
    },
    deliveryRef: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 6,
    },
    deliveryRefText: {
        fontSize: 12,
        color: colors.muted,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: colors.muted,
        marginTop: 8,
        textAlign: 'center',
    },
});

export default RatingsScreen;
