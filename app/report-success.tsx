import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/Colors";

export default function ReportSuccessScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const copyToClipboard = async () => {
        if (id) {
            await Clipboard.setStringAsync(id);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.iconCircle}>
                    <Ionicons name="checkmark" size={64} color="#059669" />
                </View>

                <Text style={styles.title}>Report Sent Successfully</Text>
                <Text style={styles.subtitle}>
                    Help is on the way. Your emergency report has been logged with the local authorities.
                </Text>

                <View style={styles.referenceContainer}>
                    <Text style={styles.referenceLabel}>REFERENCE NUMBER</Text>
                    <View style={styles.referenceRow}>
                        <Text style={styles.referenceCode} selectable>{id || "Unknown"}</Text>
                        <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
                            <Ionicons name="copy-outline" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.homeBtn}
                        onPress={() => router.replace("/(tabs)")}
                    >
                        <Text style={styles.homeBtnText}>Return to Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#fff" },
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#D1FAE5",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1e293b",
        marginBottom: 12,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 15,
        color: "#64748B",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 40,
    },
    referenceContainer: {
        width: "100%",
        backgroundColor: "#F8FAFC",
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 40,
    },
    referenceLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#94A3B8",
        letterSpacing: 1,
        marginBottom: 8,
    },
    referenceRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    referenceCode: {
        fontSize: 16,
        fontWeight: "600",
        color: "#334155",
        flex: 1,
    },
    copyBtn: {
        padding: 8,
        backgroundColor: Colors.primary + "15",
        borderRadius: 8,
    },
    footer: {
        position: "absolute",
        bottom: 40,
        left: 24,
        right: 24,
    },
    homeBtn: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    homeBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
});
