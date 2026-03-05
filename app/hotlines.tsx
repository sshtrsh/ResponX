import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EMERGENCY_CONTACTS = [
    {
        id: 1,
        category: "National Emergency",
        hotline: "911",
        description: "General emergency response & dispatch",
        icon: "warning",
        color: "#DC2626", // Red
    },
    {
        id: 2,
        category: "Police (PNP)",
        hotline: "117",
        description: "Philippine National Police Hotline",
        icon: "shield-checkmark",
        color: "#2563EB", // Blue
    },
    {
        id: 3,
        category: "Fire Department",
        hotline: "(02) 8426-0219", // Example, BFP
        description: "Bureau of Fire Protection",
        icon: "flame",
        color: "#EA580C", // Orange
    },
    {
        id: 4,
        category: "Medical Emergency",
        hotline: "1555",
        description: "Philippine Red Cross",
        icon: "medical",
        color: "#10B981", // Green
    },
    {
        id: 5,
        category: "Barangay Command Center",
        hotline: "09991234567", // Placeholder
        description: "Direct line to your local Barangay Captain/Tanod",
        icon: "business",
        color: "#6366F1", // Indigo
    },
];

export default function HotlinesScreen() {
    const router = useRouter();

    const handleCall = (number: string) => {
        // Strip non-numeric characters before dialing just in case, except (+)
        const cleanNumber = number.replace(/[^\d+]/g, "");
        Linking.openURL(`tel:${cleanNumber}`);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Emergency Hotlines</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.offlineBanner}>
                    <Ionicons name="information-circle" size={20} color="#0284C7" />
                    <Text style={styles.offlineText}>
                        These numbers are absolutely free to dial from any mobile network in the
                        Philippines, even without load or internet.
                    </Text>
                </View>

                {EMERGENCY_CONTACTS.map((contact) => (
                    <TouchableOpacity
                        key={contact.id}
                        style={styles.contactCard}
                        activeOpacity={0.7}
                        onPress={() => handleCall(contact.hotline)}
                    >
                        <View
                            style={[
                                styles.iconContainer,
                                { backgroundColor: `${contact.color}20` },
                            ]}
                        >
                            <Ionicons name={contact.icon as any} size={28} color={contact.color} />
                        </View>

                        <View style={styles.contactDetails}>
                            <Text style={styles.categoryTitle}>{contact.category}</Text>
                            <Text style={styles.hotlineNumber}>{contact.hotline}</Text>
                            <Text style={styles.contactDescription}>
                                {contact.description}
                            </Text>
                        </View>

                        <View style={[styles.callBtn, { backgroundColor: contact.color }]}>
                            <Ionicons name="call" size={20} color="#FFFFFF" />
                        </View>
                    </TouchableOpacity>
                ))}
                <View style={styles.footerPad} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },
    scrollContent: {
        padding: 20,
    },
    offlineBanner: {
        flexDirection: "row",
        backgroundColor: "#E0F2FE",
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: "flex-start",
    },
    offlineText: {
        flex: 1,
        marginLeft: 10,
        color: "#0284C7",
        fontSize: 13,
        lineHeight: 18,
        fontWeight: "500",
    },
    contactCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    contactDetails: {
        flex: 1,
    },
    categoryTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748B",
        marginBottom: 2,
    },
    hotlineNumber: {
        fontSize: 22,
        fontWeight: "800",
        color: "#0F172A",
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    contactDescription: {
        fontSize: 12,
        color: "#94A3B8",
        lineHeight: 16,
    },
    callBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
    footerPad: {
        height: 40,
    },
});
