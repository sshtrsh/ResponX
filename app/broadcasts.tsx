import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
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

export default function BroadcastScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myBarangay, setMyBarangay] = useState("");



  const fetchNews = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Get User's Barangay
      const { data: profile } = await supabase
        .from("profiles")
        .select("jurisdiction")
        .eq("id", session.user.id)
        .single();

      const userLoc = profile?.jurisdiction || "Not Set";
      setMyBarangay(userLoc);

      // 2. Fetch News (City Wide OR User's Barangay)
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .or(`barangay.eq.City Wide,barangay.eq.${userLoc}`)
        .order("created_at", { ascending: false });

      if (error) {
        // Ignored
      }
      if (data) setNews(data);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);


  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.tag,
            item.priority === "Urgent" ? styles.tagUrgent : styles.tagNormal,
          ]}
        >
          <Text
            style={[
              styles.tagText,
              item.priority === "Urgent"
                ? { color: "#DC2626" }
                : { color: "#2563EB" },
            ]}
          >
            {item.priority?.toUpperCase() || "NEWS"}
          </Text>
        </View>
        <Text style={styles.date}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.message}>{item.message}</Text>

      <View style={styles.footer}>
        <Ionicons name="person-circle-outline" size={16} color="#64748B" />
        <Text style={styles.author} numberOfLines={1}>
          Posted by {item.author_name || "Admin"} {"\u2022"} {item.barangay}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Announcements</Text>
          <Text style={styles.headerSub}>
            News for {myBarangay === "Not Set" ? "Calamba" : myBarangay}
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNews();
              }}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No announcements yet</Text>
              <Text style={styles.emptySubtext}>
                Stay tuned for updates in your area.
              </Text>
              {myBarangay === "Not Set" && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push("/(tabs)/profile")}
                >
                  <Ionicons name="location" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Set My Barangay</Text>
                </TouchableOpacity>
              )}
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
  headerSub: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
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
    marginBottom: 12,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagNormal: { backgroundColor: "#EFF6FF" },
  tagUrgent: { backgroundColor: "#FEF2F2" },
  tagText: { fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },
  date: { fontSize: 12, color: "#94A3B8" },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  author: { fontSize: 12, color: "#64748B", fontWeight: "500", flex: 1 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text.secondary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
});
