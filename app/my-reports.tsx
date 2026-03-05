import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { useAuth } from "../contexts/AuthProvider";
import { supabase } from "../lib/supabase";

export default function MyReportsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(
          "id, incident_type, status, created_at, incident_time, description, location"
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchReports();
  }, [session, fetchReports]);



  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return Colors.success;
      case "Verified":
        return Colors.primary;
      case "Rejected":
        return Colors.danger;
      default:
        return Colors.text.secondary; // Pending
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isPending = item.status === "Pending";
    const canFollowUp = ["Verified", "Under Investigation", "Escalated"].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.primary} />
            <Text style={styles.typeText}>{item.incident_type}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          {new Date(item.created_at).toDateString()} {" \u2022 "}{" "}
          {item.incident_time}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={Colors.text.secondary}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          <View style={styles.actionRow}>
            {isPending && (
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push({ pathname: "/edit-report" as any, params: { id: item.id } })}
              >
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
            {canFollowUp && (
              <TouchableOpacity
                style={styles.followUpBtn}
                onPress={() => router.push({ pathname: "/follow-up" as any, params: { id: item.id, incident_type: item.incident_type } })}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={styles.followUpBtnText}>Follow-Up</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My History</Text>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchReports();
              }}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={Colors.border}
              />
              <Text style={styles.emptyText}>No reports yet</Text>
              <Text style={styles.emptySubtext}>
                Your history will appear here.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/(tabs)/report")}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>File a Report</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeText: { fontSize: 17, fontWeight: "700", color: Colors.text.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 12, color: Colors.text.secondary, marginBottom: 12 },
  description: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  locationText: { fontSize: 12, color: Colors.text.secondary, flex: 1 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "#EFF6FF",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  followUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  followUpBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text.secondary,
  },
  emptySubtext: { fontSize: 14, color: Colors.text.secondary, marginTop: 4 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  actionButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
