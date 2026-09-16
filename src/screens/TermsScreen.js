import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

const sections = [
    {
        title: '1. Acceptance of Terms',
        content: `By downloading, installing, or using the Tezeon Courier application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the App.`
    },
    {
        title: '2. Courier Registration',
        content: `To use the App as a courier, you must:
• Be at least 18 years of age
• Possess a valid government-issued ID
• Have a valid driver's license (if using a motorized vehicle)
• Own or have legal access to a delivery vehicle
• Provide accurate and complete registration information
• Pass background verification checks`
    },
    {
        title: '3. Delivery Services',
        content: `As a courier using our platform, you agree to:
• Accept and complete deliveries in a timely manner
• Handle all packages with care
• Follow all traffic and safety laws
• Maintain professional conduct with customers
• Keep your vehicle in good working condition
• Maintain cleanliness and hygiene standards`
    },
    {
        title: '4. Earnings and Payments',
        content: `Regarding your earnings:
• You will receive payment for each completed delivery
• Delivery fees are calculated based on distance and package type
• Tips from customers are fully passed to you
• Payments are processed weekly
• Cash collections must be remitted within 48 hours
• Failure to remit cash may result in account suspension`
    },
    {
        title: '5. Premium Subscription',
        content: `The Premium subscription service:
• Costs ₵50 per month
• Provides access to marketplace delivery jobs
• Is billed monthly or deducted from earnings
• Can be cancelled at any time
• Does not guarantee a minimum number of jobs`
    },
    {
        title: '6. Account Suspension',
        content: `Your account may be suspended for:
• Repeated customer complaints
• Low rating scores (below 3.5 stars)
• Excessive delivery cancellations
• Failure to remit collected cash
• Violation of these terms
• Suspicious or fraudulent activity`
    },
    {
        title: '7. Privacy and Data',
        content: `We collect and process your personal data in accordance with our Tezeon Driver Privacy Policy (https://tezeon.com/privacy/driver):
• Location data (foreground and background) to match nearby orders and enable live delivery tracking for customers
• Identity information (Ghana Card, driver's license) for account verification and platform trust
• Delivery history and performance metrics to calculate earnings and payouts
• Your data is encrypted and never sold to third parties
• You can request account and data deletion at any time via Profile > Request Account Deletion or at https://tezeon.com/privacy/driver#account-deletion`
    },
    {
        title: '8. Liability',
        content: `Tezeon is not liable for:
• Damage to packages due to courier negligence
• Accidents or injuries during deliveries
• Loss of personal items
• Vehicle damage or maintenance costs
• Traffic violations or fines

Couriers are responsible for their own insurance coverage.`
    },
    {
        title: '9. Modifications',
        content: `We reserve the right to modify these terms at any time. Continued use of the App after changes constitutes acceptance of the new terms. We will notify you of significant changes via the App or email.`
    },
    {
        title: '10. Contact',
        content: `For questions about these terms, contact us at:
Email: legal@tezeon.com
Phone: +233 123 456 789
Address: Accra, Ghana`
    },
];

const TermsScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms & Conditions</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Last Updated */}
                <View style={styles.lastUpdated}>
                    <Ionicons name="time-outline" size={16} color={colors.muted} />
                    <Text style={styles.lastUpdatedText}>Last updated: January 1, 2026</Text>
                </View>

                {/* Introduction */}
                <View style={styles.introCard}>
                    <Text style={styles.introText}>
                        Welcome to Tezeon Courier. These terms and conditions outline the rules
                        and regulations for using our delivery partner application.
                    </Text>
                </View>

                {/* Sections */}
                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <Text style={styles.sectionContent}>{section.content}</Text>
                    </View>
                ))}

                {/* Agreement */}
                <View style={styles.agreementCard}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    <Text style={styles.agreementText}>
                        By using this app, you confirm that you have read, understood, and agree
                        to these Terms and Conditions.
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const createStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    lastUpdated: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 16,
    },
    lastUpdatedText: {
        fontSize: 12,
        color: colors.muted,
    },
    introCard: {
        backgroundColor: `${colors.primary}10`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    introText: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 22,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    sectionContent: {
        fontSize: 14,
        color: colors.muted,
        lineHeight: 22,
    },
    agreementCard: {
        flexDirection: 'row',
        backgroundColor: `${colors.success}15`,
        borderRadius: 12,
        padding: 16,
        gap: 12,
        alignItems: 'flex-start',
    },
    agreementText: {
        flex: 1,
        fontSize: 13,
        color: colors.text,
        lineHeight: 20,
    },
});

export default TermsScreen;
