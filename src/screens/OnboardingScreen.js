import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    Animated,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';

// Full Tezeon lockup rather than the app icon plus a hand-set 'Tezeon' label,
// which never quite matched the real wordmark's spacing or weight.
const WORDMARK_DARK_INK = require('../../assets/tezeon-wordmark.png');
const WORDMARK_LIGHT_INK = require('../../assets/tezeon-wordmark-white.png');

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        icon: 'bicycle',
        title: 'Welcome to Tezeon Courier',
        description: 'Your partner in delivery excellence. Join thousands of couriers earning on their own schedule.',
        // Literal, like the sibling slides: this array is module scope, so it
        // cannot read the theme, and a slide accent is brand orange either way.
        color: '#FF6B35',
    },
    {
        id: '2',
        icon: 'cash-outline',
        title: 'Earn More, Work Flexibly',
        description: 'Accept jobs that work for you. Track your earnings in real-time and get paid weekly.',
        color: '#10B981',
    },
    {
        id: '3',
        icon: 'navigate-outline',
        title: 'Smart Navigation',
        description: 'One-tap navigation to pickup and delivery locations. We integrate with Google Maps, Apple Maps, and Waze.',
        color: '#3B82F6',
    },
    {
        id: '4',
        icon: 'diamond-outline',
        title: 'Go Premium',
        description: 'Unlock marketplace jobs and earn even more. Premium couriers get priority access to high-value deliveries.',
        color: '#F59E0B',
    },
];

const OnboardingScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            navigation.replace('Login');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            navigation.replace('Login');
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
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.slide}>
                <Animated.View style={[styles.iconContainer, { backgroundColor: `${item.color}15`, transform: [{ scale }], opacity }]}>
                    <View style={[styles.iconInner, { backgroundColor: `${item.color}25` }]}>
                        <Ionicons name={item.icon} size={80} color={item.color} />
                    </View>
                </Animated.View>
                <Animated.Text style={[styles.title, { opacity }]}>{item.title}</Animated.Text>
                <Animated.Text style={[styles.description, { opacity }]}>{item.description}</Animated.Text>
            </View>
        );
    };

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {slides.map((_, index) => {
                const inputRange = [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                ];

                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                });

                const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Logo */}
            <View style={styles.logoRow}>
                <Image
                    source={theme_hook?.isDark ? WORDMARK_LIGHT_INK : WORDMARK_DARK_INK}
                    style={styles.wordmark}
                    resizeMode="contain"
                    accessibilityRole="image"
                    accessibilityLabel="Tezeon"
                />
            </View>

            {/* Skip Button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Slides */}
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

                <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: slides[currentIndex].color }]}
                    onPress={handleNext}
                >
                    {currentIndex === slides.length - 1 ? (
                        <Text style={styles.nextButtonText}>Get Started</Text>
                    ) : (
                        <>
                            <Text style={styles.nextButtonText}>Next</Text>
                            <Ionicons name="arrow-forward" size={20} color={colors.white} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        gap: 8,
    },
    wordmark: {
        width: 150,
        height: 34,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    skipText: {
        fontSize: 16,
        color: colors.muted,
        fontWeight: '500',
    },
    slide: {
        width,
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: height * 0.15,
    },
    iconContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    iconInner: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: colors.muted,
        textAlign: 'center',
        lineHeight: 24,
    },
    bottomContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        alignItems: 'center',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.white,
    },
});

export default OnboardingScreen;
