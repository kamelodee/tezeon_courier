import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const LOGO = require('../../assets/logo.png');

import DashboardScreen from '../screens/DashboardScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import MapScreen from '../screens/MapScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    return (
        <View style={[
            styles.tabBar,
            {
                paddingBottom: Math.max(insets.bottom, 10),
                backgroundColor: colors.card,
                borderTopColor: colors.border,
            }
        ]}>
            {/* Tezeon brand mark — sits above the centre Map tab */}
            <View style={styles.brandMark} pointerEvents="none">
                <Image source={LOGO} style={styles.brandLogo} resizeMode="contain" />
            </View>

            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.tabBarLabel || options.title || route.name;
                const isFocused = state.index === index;

                const getIcon = () => {
                    const icons = {
                        Home: isFocused ? 'home' : 'home-outline',
                        Deliveries: isFocused ? 'bicycle' : 'bicycle-outline',
                        Map: isFocused ? 'map' : 'map-outline',
                        Earnings: isFocused ? 'wallet' : 'wallet-outline',
                        Profile: isFocused ? 'person' : 'person-outline',
                    };
                    return icons[route.name] || 'help-outline';
                };

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        onPress={onPress}
                        style={styles.tabButton}
                    >
                        <View style={[
                            styles.tabContent,
                            isFocused && { backgroundColor: `${colors.primary}10` }
                        ]}>
                            <Ionicons
                                name={getIcon()}
                                size={24}
                                color={isFocused ? colors.primary : colors.muted}
                            />
                            <Text style={[
                                styles.tabLabel,
                                { color: isFocused ? colors.primary : colors.muted }
                            ]}>
                                {label}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const MainTabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
        >
            <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
            <Tab.Screen name="Deliveries" component={DeliveriesScreen} options={{ tabBarLabel: 'Deliveries' }} />
            <Tab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Map' }} />
            <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarLabel: 'Earnings' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        paddingTop: 10,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
    },
    tabButton: {
        flex: 1,
        alignItems: 'center',
    },
    tabContent: {
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
    brandMark: {
        position: 'absolute',
        top: -18,
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'none',
    },
    brandLogo: {
        width: 36,
        height: 36,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
});

export default MainTabNavigator;
