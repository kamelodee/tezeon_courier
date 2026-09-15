import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Animated,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';

const WORDMARK_DARK_INK = require('../../assets/tezeon-wordmark.png');
const WORDMARK_LIGHT_INK = require('../../assets/tezeon-wordmark-white.png');

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        tag: 'EARN ON YOUR SCHEDULE',
        icon: 'bicycle',
        title: 'Deliver & Keep 100% of Your Earnings',
        description: 'Connect directly with local stores and businesses across Ghana. Choose jobs on your own terms with zero hidden fees.',
        highlights: ['Flexible Hours', '0% Commission', 'Instant Job Alerts'],
        color: '#FF6B35',
    },
    {
        id: '2',
        tag: 'SMART ROUTING',
        icon: 'navigate',
        title: 'Smart Navigation & Live Traffic',
        description: 'One-tap directions to pickup and drop-off points. Seamlessly opens in Google Maps, Apple Maps, or Waze.',
        highlights: ['Turn-by-Turn GPS', 'Live Distance Tracker', 'Direct Customer Call'],
        color: '#3B82F6',
    },
    {
        id: '3',
        tag: 'SECURE HANDOFF',
        icon: 'shield-checkmark',
        title: '4-Digit OTP & Verified Handover',
        description: 'Deliver with total peace of mind. Customers give you a secure verification code and sign digitally upon arrival.',
        highlights: ['4-Digit Customer OTP', 'Photo Proof of Delivery', 'Digital Signatures'],
        color: '#10B981',
    },
    {
        id: '4',
        tag: 'INSTANT CASHOUT',
        icon: 'wallet',
        title: 'Fast Mobile Money Payouts',
        description: 'Withdraw your daily and weekly earnings directly to MTN Mobile Money, Telecel Cash, or your local bank account.',
        highlights: ['MTN & Telecel MoMo', 'Bank Transfers', 'Real-Time Earnings'],
        color: '#F59E0B',
    },
];

const OnboardingScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const isDark = theme_hook?.isDark ?? false;
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            completeOnboarding('Register');
        }
    };

    const handleSkip = () => {
        completeOnboarding('Login');
    };

    const completeOnboarding = async (targetScreen = 'Login') => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            navigation.replace(targetScreen);
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            navigation.replace(targetScreen);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const renderSlide = ({ item, index }) => {
        const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
        ];

        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.85, 1, 0.85],
            extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.slide}>
                {/* Visual Showcase Card */}
                <Animated.View style={[styles.cardShowcase, { transform: [{ scale }], opacity }]}>
                    <View style={[styles.haloOuter, { backgroundColor: `${item.color}15` }]}>
                        <View style={[styles.haloInner, { backgroundColor: `${item.color}25` }]}>
                            <Ionicons name={item.icon} size={64} color={item.color} />
                        </View>
                    </View>

                    {/* Tag badge */}
                    <View style={[styles.tagBadge, { backgroundColor: `${item.color}20` }]}>
                        <Text style={[styles.tagText, { color: item.color }]}>{item.tag}</Text>
                    </View>
                </Animated.View>

                {/* Content */}
                <Animated.View style={[styles.textSection, { opacity }]}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>

                    {/* Highlights Pills */}
                    <View style={styles.highlightsContainer}>
                        {item.highlights.map((highlight, idx) => (
                            <View key={idx} style={styles.highlightPill}>
                                <Ionicons name="checkmark-circle" size={14} color={item.color} />
                                <Text style={styles.highlightText}>{highlight}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </View>
        );
    };

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {slides.map((slide, index) => {
                const inputRange = [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                ];

                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 28, 8],
                    extrapolate: 'clamp',
                });

                const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.25, 1, 0.25],
                    extrapolate: 'clamp',
                });

                return (
                    <Animated.View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                width: dotWidth,
                                opacity: dotOpacity,
                                backgroundColor: slides[currentIndex].color,
                            },
                        ]}
                    />
                );
            })}
        </View>
    );

    const isLastSlide = currentIndex === slides.length - 1;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Top Navigation Bar */}
            <View style={styles.topBar}>
                <Image
                    source={isDark ? WORDMARK_LIGHT_INK : WORDMARK_DARK_INK}
                    style={styles.wordmark}
                    resizeMode="contain"
                    accessibilityRole="image"
                    accessibilityLabel="Tezeon"
                />

                {!isLastSlide ? (
                    <TouchableOpacity style={styles.skipPill} onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip</Text>
                        <Ionicons name="chevron-forward" size={14} color={colors.muted} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 60 }} />
                )}
            </View>

            {/* Carousel Slides */}
            <Animated.FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />

            {/* Bottom Controls */}
            <View style={styles.bottomContainer}>
                {renderDots()}

                {isLastSlide ? (
                    <View style={styles.actionGroup}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: slides[currentIndex].color }]}
                            onPress={() => completeOnboarding('Register')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryButtonText}>Register as Courier</Text>
                            <Ionicons name="arrow-forward" size={20} color={colors.white} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryLink}
                            onPress={() => completeOnboarding('Login')}
                        >
                            <Text style={styles.secondaryLinkText}>
                                Already have an account? <Text style={[styles.boldLink, { color: colors.primary }]}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.actionGroup}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: slides[currentIndex].color }]}
                            onPress={handleNext}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryButtonText}>Next</Text>
                            <Ionicons name="arrow-forward" size={20} color={colors.white} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryLink}
                            onPress={() => completeOnboarding('Login')}
                        >
                            <Text style={styles.secondaryLinkText}>
                                Already registered? <Text style={[styles.boldLink, { color: colors.primary }]}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 4,
        zIndex: 10,
    },
    wordmark: {
        width: 140,
        height: 32,
    },
    skipPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${colors.muted}15`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 2,
    },
    skipText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.muted,
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    cardShowcase: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 28,
    },
    haloOuter: {
        width: 170,
        height: 170,
        borderRadius: 85,
        justifyContent: 'center',
        alignItems: 'center',
    },
    haloInner: {
        width: 130,
        height: 130,
        borderRadius: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagBadge: {
        marginTop: 16,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
    },
    textSection: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 32,
    },
    description: {
        fontSize: 14,
        color: colors.muted,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 18,
    },
    highlightsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: 4,
    },
    highlightPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    highlightText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    bottomContainer: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        alignItems: 'center',
        width: '100%',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    actionGroup: {
        width: '100%',
        alignItems: 'center',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 15,
        borderRadius: 14,
        gap: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
    secondaryLink: {
        paddingVertical: 6,
    },
    secondaryLinkText: {
        fontSize: 13,
        color: colors.muted,
    },
    boldLink: {
        fontWeight: '700',
    },
});

export default OnboardingScreen;
