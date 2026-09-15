/**
 * Theme Context - Provides dark/light mode support across the courier app
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from './colors';

const THEME_KEY = 'courier_theme_preference';

const ThemeContext = createContext({
    isDark: false,
    colors: LIGHT_COLORS,
    toggleTheme: () => {},
    setTheme: (mode) => {},
});

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [themeMode, setThemeMode] = useState('system'); // 'light' | 'dark' | 'system'

    useEffect(() => {
        loadThemePreference();
    }, []);

    const loadThemePreference = async () => {
        try {
            const saved = await AsyncStorage.getItem(THEME_KEY);
            if (saved) {
                setThemeMode(saved);
            }
        } catch {
            // Ignore
        }
    };

    const setTheme = async (mode) => {
        setThemeMode(mode);
        try {
            await AsyncStorage.setItem(THEME_KEY, mode);
        } catch {
            // Ignore
        }
    };

    const toggleTheme = () => {
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
    };

    const isDark =
        themeMode === 'dark' ||
        (themeMode === 'system' && systemScheme === 'dark');

    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme, setTheme, themeMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
