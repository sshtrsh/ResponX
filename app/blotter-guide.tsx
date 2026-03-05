import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";

export default function BlotterGuideScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blotter Guidelines</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro Banner */}
        <View style={styles.banner}>
          <Ionicons name="scale-outline" size={48} color={Colors.primary} />
          <Text style={styles.bannerTitle}>Katarungang Pambarangay</Text>
          <Text style={styles.bannerText}>
            Not all issues are police matters. Use this guide to know when to
            file a case at the Barangay Hall.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What must be filed in Barangay?</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.rowText}>Collection of Debts (Utang)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.rowText}>Neighborhood Fights / Gossip</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.rowText}>Property Boundary Disputes</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.rowText}>Damage to Property (Minor)</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>What goes directly to Police?</Text>
        <View style={[styles.card, { borderColor: "#FCA5A5" }]}>
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.rowText}>Theft / Robbery</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.rowText}>Physical Injury (Serious)</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.rowText}>Illegal Drugs</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>How to File a Complaint</Text>
        <View style={styles.stepContainer}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Visit the Barangay Hall</Text>
            <Text style={styles.stepDesc}>
              Bring a valid ID and any evidence.
            </Text>
          </View>
        </View>
        <View style={styles.stepLine} />

        <View style={styles.stepContainer}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>File &quot;Sumbong&quot;</Text>
            <Text style={styles.stepDesc}>
              The Secretary will record it in the Official Blotter.
            </Text>
          </View>
        </View>
        <View style={styles.stepLine} />

        <View style={styles.stepContainer}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNum}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Mediation / Hearing</Text>
            <Text style={styles.stepDesc}>
              You and the respondent will be summoned for settlement.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: Colors.text.primary },
  content: { padding: 20 },
  banner: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  bannerText: { textAlign: "center", color: "#475569", lineHeight: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  rowText: { fontSize: 15, color: "#334155" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 4 },
  stepContainer: { flexDirection: "row", alignItems: "flex-start" },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  stepNum: { color: "#fff", fontWeight: "bold" },
  stepContent: { marginLeft: 16, flex: 1, paddingTop: 4 },
  stepTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  stepDesc: { color: "#64748B", marginTop: 4, lineHeight: 20 },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: "#E2E8F0",
    marginLeft: 15,
    marginVertical: 0,
  },
});
