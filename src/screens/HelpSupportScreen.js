import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import courierApi from '../services/courierApi';
import { useTheme } from '../theme/ThemeContext';

const faqs = [
    {
        id: '1',
        question: 'How do I accept a delivery?',
        answer: 'When a new delivery is available, you will receive a notification. Tap on the notification or go to the Deliveries tab to view available jobs. Tap "Accept" to take the delivery.',
    },
    {
        id: '2',
        question: 'How do I get paid?',
        answer: 'Earnings are calculated for each completed delivery. You can view your earnings in the Earnings tab. Payments are processed weekly to your registered mobile money account.',
    },
    {
        id: '3',
        question: 'What is Premium subscription?',
        answer: 'Premium subscription (₵50/month) gives you access to marketplace jobs - deliveries posted by the public. This allows you to earn more by taking additional jobs outside your regular assignments.',
    },
    {
        id: '4',
        question: 'How do I go online/offline?',
        answer: 'On the Dashboard, you\'ll see a toggle switch at the top. When online, you will receive new job notifications. Go offline when you\'re done for the day.',
    },
    {
        id: '5',
        question: 'What happens if I can\'t complete a delivery?',
        answer: 'If you cannot complete a delivery, use the "Report Issue" button on the delivery details screen. Select the reason and provide details. Our support team will assist you.',
    },
    {
        id: '6',
        question: 'How do I update my vehicle information?',
        answer: 'Go to Profile > Edit Profile to update your vehicle type, registration number, and upload updated vehicle photos.',
    },
    {
        id: '7',
        question: 'Why was my account restricted?',
        answer: 'Accounts may be restricted for low ratings, excessive cancellations, or cash remittance issues. Contact support for more information about your specific case.',
    },
];

const HelpSupportScreen = ({ navigation }) => {
    const theme_hook = useTheme();
    const colors = theme_hook?.colors ?? {};
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [expandedId, setExpandedId] = useState(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const toggleFaq = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handleContact = (method) => {
        switch (method) {
            case 'phone':
                Linking.openURL('tel:+233123456789');
                break;
            case 'email':
                Linking.openURL('mailto:support@tezeon.com?subject=Courier App Support');
                break;
            case 'whatsapp':
                Linking.openURL('https://wa.me/233123456789?text=Hi, I need help with the Tezeon Courier app');
                break;
        }
    };

    const handleSubmit = async () => {
        if (!message.trim()) {
            Alert.alert('Error', 'Please enter your message');
            return;
        }
        setSending(true);
        try {
            const response = await courierApi.reportIssue({
                issue_type: 'general',
                description: message.trim(),
            });
            if (response.success) {
                Alert.alert(
                    'Message Sent',
                    "Thank you for contacting us. We'll get back to you within 24 hours.",
                    [{ text: 'OK', onPress: () => setMessage('') }]
                );
            } else {
                Alert.alert('Error', response.error || 'Failed to send message. Please try again.');
            }
        } catch {
            Alert.alert('Error', 'An error occurred. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const ContactCard = ({ icon, title, subtitle, onPress, color }) => (
        <TouchableOpacity style={styles.contactCard} onPress={onPress}>
            <View style={[styles.contactIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View style={styles.contactContent}>
                <Text style={styles.contactTitle}>{title}</Text>
                <Text style={styles.contactSubtitle}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Contact Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONTACT US</Text>
                    <View style={styles.contactCards}>
                        <ContactCard
                            icon="call"
                            title="Call Us"
                            subtitle="Mon-Fri, 8AM-6PM"
                            onPress={() => handleContact('phone')}
                            color="#10B981"
                        />
                        <ContactCard
                            icon="mail"
                            title="Email"
                            subtitle="support@tezeon.com"
                            onPress={() => handleContact('email')}
                            color="#3B82F6"
                        />
                        <ContactCard
                            icon="logo-whatsapp"
                            title="WhatsApp"
                            subtitle="Quick response"
                            onPress={() => handleContact('whatsapp')}
                            color="#25D366"
                        />
                    </View>
                </View>

                {/* FAQs */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>FREQUENTLY ASKED QUESTIONS</Text>
                    <View style={styles.faqList}>
                        {faqs.map((faq) => (
                            <TouchableOpacity
                                key={faq.id}
                                style={styles.faqItem}
                                onPress={() => toggleFaq(faq.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.faqQuestion}>
                                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                                    <Ionicons
                                        name={expandedId === faq.id ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color={colors.muted}
                                    />
                                </View>
                                {expandedId === faq.id && (
                                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Send Message */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SEND US A MESSAGE</Text>
                    <View style={styles.messageCard}>
                        <TextInput
                            style={styles.messageInput}
                            placeholder="Describe your issue or question..."
                            placeholderTextColor={colors.muted}
                            multiline
                            numberOfLines={4}
                            value={message}
                            onChangeText={setMessage}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={[styles.submitButton, sending && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={sending}
                        >
                            {sending
                                ? <ActivityIndicator color={colors.white} />
                                : <>
                                    <Text style={styles.submitText}>Send Message</Text>
                                    <Ionicons name="send" size={18} color={colors.white} />
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Emergency */}
                <View style={styles.emergencyCard}>
                    <View style={styles.emergencyIcon}>
                        <Ionicons name="warning" size={24} color={colors.error} />
                    </View>
                    <View style={styles.emergencyContent}>
                        <Text style={styles.emergencyTitle}>Emergency?</Text>
                        <Text style={styles.emergencyText}>
                            If you're in danger during a delivery, please call emergency services immediately.
                        </Text>
                    </View>
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
    },
    section: {
        padding: 16,
        paddingBottom: 0,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.muted,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    contactCards: {
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    contactIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactContent: {
        flex: 1,
        marginLeft: 12,
    },
    contactTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    contactSubtitle: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 2,
    },
    faqList: {
        backgroundColor: colors.white,
        borderRadius: 12,
        overflow: 'hidden',
    },
    faqItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    faqQuestion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        marginRight: 12,
    },
    faqAnswer: {
        fontSize: 13,
        color: colors.muted,
        marginTop: 12,
        lineHeight: 20,
    },
    messageCard: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
    },
    messageInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: colors.text,
        minHeight: 100,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 8,
        marginTop: 12,
        gap: 8,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
    },
    emergencyCard: {
        flexDirection: 'row',
        backgroundColor: '#FEE2E2',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    emergencyIcon: {
        marginRight: 12,
    },
    emergencyContent: {
        flex: 1,
    },
    emergencyTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.error,
    },
    emergencyText: {
        fontSize: 13,
        color: '#7F1D1D',
        marginTop: 4,
        lineHeight: 18,
    },
});

export default HelpSupportScreen;
