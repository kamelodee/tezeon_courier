module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    alias: {
                        'react-native-web/dist/exports/DeviceEventEmitter': 'react-native-web/dist/exports/DeviceEventEmitter/index.js',
                        'react-native/Libraries/Utilities/codegenNativeCommands': './src/mocks/codegenNativeCommands.js',
                    },
                },
            ],
        ],
    };
};
