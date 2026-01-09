import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = (props) => {
    return (
        <View style={[styles.container, props.style]}>
            <Text style={styles.text}>Map view not supported on web</Text>
            {props.children}
        </View>
    );
};

export const Marker = (props) => {
    return props.children ? <View>{props.children}</View> : null;
};

export const Polyline = () => null;
export const Callout = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#eee',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    text: {
        color: '#666',
        fontSize: 12
    }
});

export default MapView;
