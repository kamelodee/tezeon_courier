const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Create a mock for any native-only modules that break the web build
const mocksPath = path.resolve(__dirname, 'src/mocks');

// Fixes for Web build
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    // Fix for react-native-web 0.21.0 DeviceEventEmitter resolution
    'react-native-web/dist/exports/DeviceEventEmitter': path.resolve(__dirname, 'node_modules/react-native-web/dist/exports/DeviceEventEmitter'),
    // Fix for react-native-maps importing native-only codegen commands
    'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(mocksPath, 'codegenNativeCommands.js'),
};

module.exports = config;
