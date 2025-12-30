import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

import DashboardScreen from '../screens/DashboardScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }) => {
    return (
        <View style={styles.tabBar}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = options.tabBarLabel || options.title || route.name;
                const isFocused = state.index === index;

                const getIcon = () => {
                    const icons = {
                        Home: isFocused ? 'home' : 'home-outline',
                        Deliveries: isFocused ? 'bicycle' : 'bicycle-outline',
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
                            isFocused && styles.tabContentActive
                        ]}>
                            <Ionicons
                                name={getIcon()}
                                size={24}
                                color={isFocused ? COLORS.primary : COLORS.muted}
                            />
                            <Text style={[
                                styles.tabLabel,
                                { color: isFocused ? COLORS.primary : COLORS.muted }
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
            <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarLabel: 'Earnings' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        paddingBottom: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
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
    tabContentActive: {
        backgroundColor: `${COLORS.primary}10`,
    },
    tabLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
    },
});

export default MainTabNavigator;
