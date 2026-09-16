import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Switch,
    RefreshControl,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import courierApi from '../services/courierApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGO = require('../../assets/logo.png');

// ── Mini arc / progress ring ──────────────────────────────────────────────────
// Pure-RN approach: two layered Views with borderRadius clipping
const Ring = ({ value, max, size = 56, color, label, sublabel }) => {
    const pct = Math.min(Math.max(value / max, 0), 1);
    const filled = pct >= 1;
    return (
        <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{
                width: size, height: size, borderRadius: size / 2,
                borderWidth: 4, borderColor: `${color}25`,
                justifyContent: 'center', alignItems: 'center',
                overflow: 'hidden',
            }}>
                {/* filled arc approximation using background + border color */}
                <View style={{
                    ...StyleSheet.absoluteFillObject,
                    borderRadius: size / 2,
                    borderWidth: 4,
                    borderColor: color,
                    opacity: pct,
                }} />
                <Text style={{ fontSize: size * 0.22, fontWeight: '800', color }}>{label}</Text>
            </View>
            {sublabel ? <Text style={{ fontSize: 10, color, fontWeight: '600', opacity: 0.8 }}>{sublabel}</Text> : null}
        </View>
    );
};

// ── ProfileScreen ─────────────────────────────────────────────────────────────

const ProfileScreen = ({ navigation }) => {
    const { colors, isDark, toggleTheme } = useTheme();

    const [profile,   setProfile]   = useState(null);
    const [earnings,  setEarnings]  = useState(null);
    const [streak,    setStreak]    = useState(0);
    const [loading,   setLoading]   = useState(true);
    const [refreshing,setRefreshing]= useState(false);

    // ── Load ──────────────────────────────────────────────────────────────────

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [profRes, earnRes] = await Promise.allSettled([
                courierApi.getProfile(),
                courierApi.getEarningsSummary(),
            ]);

            if (profRes.status === 'fulfilled') {
                const r = profRes.value;
                // getProfile() returns { success, data: {...} }
                // data itself may be the flat profile, or wrapped again in .data
                let raw = r?.data ?? r;
                if (raw?.data && typeof raw.data === 'object') raw = raw.data;
                // Ensure name always shows — fall back to username or email prefix
                if (raw && !raw.full_name) {
                    raw = {
                        ...raw,
                        full_name: raw.username
                            || (raw.email ? raw.email.split('@')[0] : '')
                            || 'Courier',
                    };
                }
                if (raw) setProfile(raw);
            }
            if (earnRes.status === 'fulfilled') {
                const r = earnRes.value;
                const raw = r?.data ?? r;
                if (raw) setEarnings(raw);
            }

            const s = await AsyncStorage.getItem('deliveryStreak');
            if (s) setStreak(parseInt(s) || 0);
        } catch (e) {
            // silent
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
        const unsub = navigation.addListener('focus', () => load(true));
        return unsub;
    }, [navigation, load]);

    const onRefresh = () => { setRefreshing(true); load(true); };

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleLogout = () => {
        Alert.alert('Logout', 'Sign out of your courier account?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await courierApi.logout();
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                },
            },
        ]);
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const vehicleIcon = (type) => ({
        motorcycle: 'bicycle', bicycle: 'bicycle', car: 'car',
        van: 'bus', truck: 'bus', foot: 'walk',
    }[type] || 'bicycle');

    const fmt = (n) => `₵${parseFloat(n || 0).toFixed(2)}`;

    const displayName  = (profile?.full_name  || '').trim() || (profile?.username || '').trim() || 'Courier';
    const displayEmail = (profile?.email || '').trim() || (profile?.phone || '').trim() || '';

    const initials = (name) =>
        (name || 'C').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'C';

    // ── Sub-components ────────────────────────────────────────────────────────

    const MenuItem = ({ icon, title, subtitle, onPress, accent, badge, last }) => (
        <TouchableOpacity
            style={[s.menuRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[s.menuIconWrap, { backgroundColor: `${accent || colors.primary}18` }]}>
                <Ionicons name={icon} size={20} color={accent || colors.primary} />
            </View>
            <View style={s.menuBody}>
                <Text style={[s.menuTitle, { color: colors.text }]}>{title}</Text>
                {subtitle ? <Text style={[s.menuSub, { color: colors.muted }]}>{subtitle}</Text> : null}
            </View>
            {badge ? (
                <View style={[s.menuBadge, { backgroundColor: `${accent || colors.primary}18` }]}>
                    <Text style={[s.menuBadgeText, { color: accent || colors.primary }]}>{badge}</Text>
                </View>
            ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            )}
        </TouchableOpacity>
    );

    // ── Loading ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <SafeAreaView style={[s.screen, { backgroundColor: colors.background }]}>
                <View style={s.loadingCenter}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const isEmployee    = !!profile?.employer_name;
    const isVerified    = !!profile?.is_verified;
    const rating        = parseFloat(profile?.average_rating || 5);
    const successRate   = parseFloat(profile?.success_rate || 100);
    const totalDeliveries = profile?.total_deliveries || 0;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={[s.screen, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[s.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <View style={s.headerLogoRow}>
                    <Image source={LOGO} style={s.headerLogo} resizeMode="contain" />
                    <Text style={[s.headerTitle, { color: colors.text }]}>Profile</Text>
                </View>
                <TouchableOpacity
                    style={[s.editBtn, { backgroundColor: `${colors.primary}15` }]}
                    onPress={() => navigation.navigate('EditProfile', { profile })}
                >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
            >
                {/* ── Hero card ─────────────────────────────────────────── */}
                <View style={[s.heroCard, { backgroundColor: colors.primary }]}>
                    {/* Avatar */}
                    <TouchableOpacity
                        style={s.avatarWrap}
                        onPress={() => navigation.navigate('EditProfile', { profile })}
                    >
                        {profile?.profile_photo ? (
                            <Image source={{ uri: profile.profile_photo }} style={s.avatar} />
                        ) : (
                            <View style={[s.avatarFallback, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                                <Text style={s.avatarInitials}>{initials(displayName)}</Text>
                            </View>
                        )}
                        <View style={s.cameraChip}>
                            <Ionicons name="camera" size={12} color="#fff" />
                        </View>
                        <View style={[
                            s.onlineDot,
                            { backgroundColor: profile?.is_online ? '#34D399' : '#94A3B8' }
                        ]} />
                    </TouchableOpacity>

                    <Text style={s.heroName}>{displayName || 'Courier'}</Text>
                    <Text style={s.heroEmail}>{displayEmail}</Text>

                    {/* Online / offline pill */}
                    <View style={[s.statusPill, { backgroundColor: profile?.is_online ? '#059669' : 'rgba(255,255,255,0.15)' }]}>
                        <View style={[s.statusDot, { backgroundColor: profile?.is_online ? '#A7F3D0' : '#94A3B8' }]} />
                        <Text style={s.statusPillText}>{profile?.is_online ? 'Online — Receiving Jobs' : 'Offline'}</Text>
                    </View>

                    {/* Fleet badge */}
                    {isEmployee && (
                        <View style={s.fleetBadge}>
                            <Ionicons name="business" size={13} color="#fff" />
                            <Text style={s.fleetBadgeText}>{profile.employer_name}</Text>
                            <View style={s.fleetPill}>
                                <Ionicons name="checkmark-circle" size={11} color="#34D399" />
                                <Text style={s.fleetPillText}>Fleet ✓</Text>
                            </View>
                        </View>
                    )}

                    {/* Streak */}
                    {streak > 0 && (
                        <View style={s.streakChip}>
                            <Ionicons name="flame" size={13} color="#FB923C" />
                            <Text style={s.streakText}>{streak}-day streak</Text>
                        </View>
                    )}
                </View>

                {/* ── Earnings strip ─────────────────────────────────────── */}
                <View style={[s.earningsStrip, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
                    {[
                        { label: 'Today',    value: fmt(earnings?.today),           accent: colors.text },
                        { label: 'This Week',value: fmt(earnings?.this_week),        accent: colors.text },
                        { label: 'Pending',  value: fmt(earnings?.pending_payout),   accent: '#F59E0B' },
                        { label: 'Total',    value: fmt(earnings?.total || profile?.total_earnings), accent: colors.primary },
                    ].map((item, i, arr) => (
                        <TouchableOpacity
                            key={item.label}
                            style={[s.earnItem, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}
                            onPress={() => navigation.navigate('Earnings')}
                        >
                            <Text style={[s.earnValue, { color: item.accent }]}>{item.value}</Text>
                            <Text style={[s.earnLabel, { color: colors.muted }]}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Performance rings ──────────────────────────────────── */}
                <View style={[s.card, { backgroundColor: colors.white }]}>
                    <Text style={[s.cardTitle, { color: colors.text }]}>Performance</Text>
                    <View style={s.ringsRow}>
                        <Ring
                            value={rating} max={5} size={64}
                            color="#F59E0B"
                            label={rating.toFixed(1)}
                            sublabel="Rating"
                        />
                        <Ring
                            value={successRate} max={100} size={64}
                            color={colors.primary}
                            label={`${Math.round(successRate)}%`}
                            sublabel="Success"
                        />
                        <Ring
                            value={Math.min(totalDeliveries, 200)} max={200} size={64}
                            color="#10B981"
                            label={totalDeliveries > 999 ? `${(totalDeliveries/1000).toFixed(1)}k` : String(totalDeliveries)}
                            sublabel="Deliveries"
                        />
                        <Ring
                            value={parseFloat(profile?.on_time_rate || 95)} max={100} size={64}
                            color="#6366F1"
                            label={`${Math.round(profile?.on_time_rate || 95)}%`}
                            sublabel="On-Time"
                        />
                    </View>
                </View>

                {/* ── Vehicle card ───────────────────────────────────────── */}
                <TouchableOpacity
                    style={[s.card, { backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' }]}
                    onPress={() => navigation.navigate('EditProfile', { profile })}
                >
                    <View style={[s.vehicleIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                        <Ionicons name={vehicleIcon(profile?.vehicle_type)} size={28} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[s.vehicleType, { color: colors.text }]}>
                            {(profile?.vehicle_type || 'Motorcycle').charAt(0).toUpperCase() + (profile?.vehicle_type || 'motorcycle').slice(1)}
                        </Text>
                        <Text style={[s.vehiclePlate, { color: colors.muted }]}>
                            {profile?.vehicle_number || 'No plate number'}
                        </Text>
                        {profile?.license_number ? (
                            <Text style={[s.licenseText, { color: colors.muted }]}>
                                License: {profile.license_number}
                            </Text>
                        ) : null}
                    </View>
                    {isVerified ? (
                        <View style={[s.verifiedChip, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="checkmark-circle" size={14} color="#059669" />
                            <Text style={[s.verifiedChipText, { color: '#059669' }]}>Verified</Text>
                        </View>
                    ) : !isEmployee ? (
                        <View style={[s.verifiedChip, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="alert-circle" size={14} color="#D97706" />
                            <Text style={[s.verifiedChipText, { color: '#D97706' }]}>Pending</Text>
                        </View>
                    ) : null}
                </TouchableOpacity>

                {/* ── Verification notice (freelance only) ───────────────── */}
                {!isEmployee && !isVerified && (
                    <TouchableOpacity
                        style={[s.noticeCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                        onPress={() => navigation.navigate('Verification', { profile })}
                    >
                        <Ionicons name="alert-circle" size={22} color="#D97706" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontWeight: '700', color: '#92400E' }}>Verification Required</Text>
                            <Text style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>
                                Upload your Ghana Card and Driver's License to go online.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#D97706" />
                    </TouchableOpacity>
                )}

                {/* ── Pending payout notice ──────────────────────────────── */}
                {parseFloat(earnings?.pending_payout || 0) > 0 && (
                    <TouchableOpacity
                        style={[s.noticeCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
                        onPress={() => navigation.navigate('Payout', { balance: earnings?.total })}
                    >
                        <Ionicons name="wallet" size={22} color={colors.primary} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontWeight: '700', color: colors.primary }}>
                                {fmt(earnings.pending_payout)} available for payout
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                                Tap to withdraw to your mobile money account.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                    </TouchableOpacity>
                )}

                {/* ── Account menu ───────────────────────────────────────── */}
                <View style={[s.menuCard, { backgroundColor: colors.white }]}>
                    <Text style={[s.sectionLabel, { color: colors.muted }]}>ACCOUNT</Text>
                    <MenuItem
                        icon="person-outline"
                        title="Edit Profile"
                        subtitle="Name, phone, vehicle details"
                        onPress={() => navigation.navigate('EditProfile', { profile })}
                    />
                    {!isEmployee && (
                        <MenuItem
                            icon="shield-checkmark-outline"
                            title="Identity & Verification"
                            subtitle={isVerified ? 'Account verified' : 'Action required — tap to upload'}
                            onPress={() => navigation.navigate('Verification', { profile })}
                            accent={isVerified ? '#10B981' : '#F59E0B'}
                            badge={isVerified ? '✓' : '!'}
                        />
                    )}
                    <MenuItem
                        icon="wallet-outline"
                        title="Earnings"
                        subtitle={`${fmt(earnings?.total || profile?.total_earnings)} total earned`}
                        onPress={() => navigation.navigate('Earnings')}
                        accent="#10B981"
                    />
                    <MenuItem
                        icon="star-outline"
                        title="My Ratings"
                        subtitle={`${profile?.total_ratings || 0} customer reviews · ${rating.toFixed(1)} avg`}
                        onPress={() => navigation.navigate('Ratings')}
                        accent="#F59E0B"
                    />
                    <MenuItem
                        icon="time-outline"
                        title="Delivery History"
                        subtitle="View all past deliveries"
                        onPress={() => navigation.navigate('Deliveries', { filter: 'history' })}
                        last
                    />
                </View>

                {/* ── Settings menu ──────────────────────────────────────── */}
                <View style={[s.menuCard, { backgroundColor: colors.white, marginTop: 16 }]}>
                    <Text style={[s.sectionLabel, { color: colors.muted }]}>SETTINGS</Text>
                    <MenuItem
                        icon="notifications-outline"
                        title="Notifications"
                        subtitle="Push alerts, job offers"
                        onPress={() => navigation.navigate('NotificationSettings')}
                    />
                    <MenuItem
                        icon="location-outline"
                        title="Location Settings"
                        subtitle="Background tracking, accuracy"
                        onPress={() => navigation.navigate('LocationSettings')}
                    />
                    <MenuItem
                        icon="help-circle-outline"
                        title="Help & Support"
                        subtitle="FAQs, contact team"
                        onPress={() => navigation.navigate('HelpSupport')}
                    />
                    <MenuItem
                        icon="document-text-outline"
                        title="Terms & Conditions"
                        onPress={() => navigation.navigate('Terms')}
                    />
                    <MenuItem
                        icon="shield-checkmark-outline"
                        title="Privacy Policy"
                        subtitle="Location & data policies"
                        onPress={() => Linking.openURL('https://tezeon.com/privacy/driver')}
                    />
                    {/* Dark Mode row */}
                    <View style={[s.menuRow, { borderBottomWidth: 0 }]}>
                        <View style={[s.menuIconWrap, { backgroundColor: `${colors.secondary}18` }]}>
                            <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={colors.secondary} />
                        </View>
                        <View style={s.menuBody}>
                            <Text style={[s.menuTitle, { color: colors.text }]}>Dark Mode</Text>
                            <Text style={[s.menuSub, { color: colors.muted }]}>{isDark ? 'On' : 'Off'}</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: colors.border, true: `${colors.primary}80` }}
                            thumbColor={isDark ? colors.primary : '#fff'}
                        />
                    </View>
                </View>

                {/* ── Logout ─────────────────────────────────────────────── */}
                <TouchableOpacity
                    style={[s.logoutBtn, { backgroundColor: colors.white }]}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={s.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                {/* ── Account Deletion Request (Google Play Compliance) ── */}
                <TouchableOpacity
                    style={{ paddingVertical: 12, alignItems: 'center' }}
                    onPress={() => {
                        Alert.alert(
                            'Request Account Deletion',
                            'Are you sure you want to request deletion of your Tezeon Driver account and personal data? You will be directed to our data deletion portal, or you can email privacy@tezeon.com.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Continue to Portal',
                                    style: 'destructive',
                                    onPress: () => Linking.openURL('https://tezeon.com/privacy/driver#account-deletion'),
                                },
                            ]
                        );
                    }}
                >
                    <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>
                        Request Account Deletion
                    </Text>
                </TouchableOpacity>

                <Text style={[s.version, { color: colors.muted }]}>Tezeon Driver · v1.0.0</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    screen:       { flex: 1 },
    loadingCenter:{ flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerLogoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    headerLogo: {
        width: 30, height: 30, borderRadius: 7,
    },
    headerTitle:  { fontSize: 22, fontWeight: '800' },
    editBtn: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },

    // Hero card
    heroCard: {
        alignItems: 'center',
        paddingTop: 32,
        paddingBottom: 28,
        paddingHorizontal: 20,
        gap: 8,
    },
    avatarWrap:    { position: 'relative', marginBottom: 4 },
    avatar:        { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
    avatarFallback:{
        width: 90, height: 90, borderRadius: 45,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarInitials:{ fontSize: 34, fontWeight: '800', color: '#fff' },
    cameraChip: {
        position: 'absolute', bottom: 2, right: 2,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center', alignItems: 'center',
    },
    onlineDot: {
        position: 'absolute', top: 4, right: 2,
        width: 14, height: 14, borderRadius: 7,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)',
    },
    heroName:  { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 4 },
    heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
    statusPill:{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 4,
    },
    statusDot:     { width: 8, height: 8, borderRadius: 4 },
    statusPillText:{ fontSize: 12, fontWeight: '600', color: '#fff' },
    fleetBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    fleetBadgeText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
    fleetPill: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: 'rgba(52,211,153,0.2)',
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
    },
    fleetPillText: { fontSize: 10, fontWeight: '700', color: '#34D399' },
    streakChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(251,146,60,0.2)',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    streakText:    { fontSize: 12, fontWeight: '700', color: '#FB923C' },

    // Earnings strip
    earningsStrip: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    earnItem: {
        flex: 1, alignItems: 'center', paddingVertical: 16,
    },
    earnValue: { fontSize: 15, fontWeight: '800' },
    earnLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

    // Card
    card: {
        marginHorizontal: 16, marginTop: 16,
        borderRadius: 16, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 16 },

    // Performance rings
    ringsRow: { flexDirection: 'row', justifyContent: 'space-between' },

    // Vehicle
    vehicleIconWrap:{ width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
    vehicleType:    { fontSize: 16, fontWeight: '700' },
    vehiclePlate:   { fontSize: 13, marginTop: 2 },
    licenseText:    { fontSize: 12, marginTop: 3 },
    verifiedChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    verifiedChipText: { fontSize: 11, fontWeight: '700' },

    // Notice cards
    noticeCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginTop: 16,
        borderRadius: 14, padding: 16,
        borderWidth: 1,
    },

    // Menu
    menuCard:   { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    sectionLabel:{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
    menuRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    menuIconWrap: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    menuBody:     { flex: 1, marginLeft: 12 },
    menuTitle:    { fontSize: 14, fontWeight: '600' },
    menuSub:      { fontSize: 12, marginTop: 1 },
    menuBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    menuBadgeText:{ fontSize: 11, fontWeight: '800' },

    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginHorizontal: 16, marginTop: 20,
        paddingVertical: 16, borderRadius: 14, gap: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    logoutText:{ fontSize: 16, fontWeight: '700', color: '#EF4444' },
    version:   { textAlign: 'center', marginTop: 16, fontSize: 11 },
});

export default ProfileScreen;
