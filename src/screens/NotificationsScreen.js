import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import courierApi from '../services/courierApi';

const NOTIFICATION_ICONS = {
    new_job: { name: 'bicycle', color: '#3B82F6' },
    delivery_update: { name: 'cube', color: '#8B5CF6' },
    earnings: { name: 'wallet', color: '#10B981' },
    payout: { name: 'cash', color: '#F59E0B' },
    system: { name: 'information-circle', color: '#6B7280' },
};

const getIcon = (type) => NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.system;

const NotificationsScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const res = await courierApi.getNotifications();
            if (res.success) {
                setNotifications(Array.isArray(res.data) ? res.data : []);
            }
        } catch (e) {
            console.error('Load notifications error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadNotifications();
    }, []);

    const handlePress = async (item) => {
        // Mark as read if not already
        if (!item.is_read) {
            await courierApi.markNotificationRead(item.id);
            setNotifications(prev =>
                prev.map(n => n.id === item.id ? { ...n, is_read: true } : n)
            );
        }

        // Navigate based on type
        if (item.data?.delivery_id) {
            navigation.navigate('DeliveryDetails', { deliveryId: item.data.delivery_id });
        } else if (item.type === 'earnings' || item.type === 'payout') {
            navigation.navigate('Earnings');
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item }) => {
        const { name: iconName, color: iconColor } = getIcon(item.type);
        return (
            <TouchableOpacity
                style={[
                    styles.item,
                    { backgroundColor: item.is_read ? colors.white : `${colors.primary}08` },
                ]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
                    <Ionicons name={iconName} size={22} color={iconColor} />
                </View>
                <View style={styles.textWrap}>
                    <Text style={styles.title} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {item.message || item.body}
                    </Text>
                    <Text style={styles.time}>
                        {formatTime(item.created_at)}
                    </Text>
                </View>
                {!item.is_read && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item, i) => item.id?.toString() || i.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="notifications-off-outline" size={64} color={colors.muted} />
                        <Text style={styles.emptyTitle}>No Notifications</Text>
                        <Text style={styles.emptyText}>
                            You're all caught up!
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: colors.primary,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.white },
    item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        flexShrink: 0,
    },
    textWrap: { flex: 1 },
    title: { fontSize: 14, fontWeight: '600', marginBottom: 3, color: colors.text },
    body: { fontSize: 13, lineHeight: 18, marginBottom: 4, color: colors.muted },
    time: { fontSize: 11, color: colors.muted },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 8,
        marginTop: 6,
        flexShrink: 0,
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, color: colors.text },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, color: colors.muted },
});

export default NotificationsScreen;
