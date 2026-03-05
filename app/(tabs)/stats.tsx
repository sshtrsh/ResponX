import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { supabase } from "../../lib/supabase";

// --- TYPES ---
type Report = {
  id: string;
  incident_type: string;
  status: string;
  created_at: string;
  location: string;
  priority: string;
};

type TypeCount = { type: string; count: number; icon: string; color: string };

// --- ICON & COLOR MAP ---
const TYPE_META: Record<string, { icon: string; color: string }> = {
  Fire: { icon: "flame", color: "#EF4444" },
  Medical: { icon: "medkit", color: "#F97316" },
  Accident: { icon: "car", color: "#EAB308" },
  Assault: { icon: "hand-left", color: "#DC2626" },
  Drugs: { icon: "skull", color: "#7C3AED" },
  Theft: { icon: "alert-circle", color: "#3B82F6" },
  Vandalism: { icon: "hammer", color: "#6366F1" },
  Others: { icon: "help-circle", color: "#64748B" },
};

export default function StatsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("30");

  const fetchReports = useCallback(async () => {
    const since = new Date();
    since.setDate(since.getDate() - Number(timeRange));

    const { data, error } = await supabase
      .from("reports")
      .select("id, incident_type, status, created_at, location, priority")
      .in("status", ["Verified", "Resolved", "verified", "resolved"])
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false });

    if (!error && data) setReports(data);
    setLoading(false);
    setRefreshing(false);
  }, [timeRange]);

  useEffect(() => {
    setLoading(true);
    void fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchReports();
  };

  // --- COMPUTED STATS ---
  const totalReports = reports.length;
  const resolvedCount = reports.filter(
    (r) => r.status.toLowerCase() === "resolved",
  ).length;
  const resolutionRate =
    totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;

  const typeCounts: TypeCount[] = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reports) {
      map[r.incident_type] = (map[r.incident_type] || 0) + 1;
    }
    return Object.entries(map)
      .map(([type, count]) => ({
        type,
        count,
        icon: TYPE_META[type]?.icon || "help-circle",
        color: TYPE_META[type]?.color || "#64748B",
      }))
      .sort((a, b) => b.count - a.count);
  }, [reports]);

  const topType = typeCounts[0];
  const maxCount = topType?.count || 1;

  // Recent activity
  const recentReports = reports.slice(0, 5);

  // Location hotspots
  const locationCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reports) {
      if (r.location) {
        map[r.location] = (map[r.location] || 0) + 1;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [reports]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community Safety</Text>
          <Text style={styles.headerSubtitle}>
            Incident statistics in your area
          </Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* TIME RANGE SELECTOR */}
      <View style={styles.timeRow}>
        {(["7", "30", "90"] as const).map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setTimeRange(range)}
            style={[
              styles.timeChip,
              timeRange === range && styles.timeChipActive,
            ]}
          >
            <Text
              style={[
                styles.timeChipText,
                timeRange === range && styles.timeChipTextActive,
              ]}
            >
              {range === "7" ? "7 Days" : range === "30" ? "30 Days" : "90 Days"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Analyzing reports…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* KPI CARDS */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { borderLeftColor: Colors.primary }]}>
              <Text style={styles.kpiValue}>{totalReports}</Text>
              <Text style={styles.kpiLabel}>Total Incidents</Text>
            </View>
            <View style={[styles.kpiCard, { borderLeftColor: Colors.success }]}>
              <Text style={[styles.kpiValue, { color: Colors.success }]}>
                {resolutionRate}%
              </Text>
              <Text style={styles.kpiLabel}>Resolved</Text>
            </View>
            <View style={[styles.kpiCard, { borderLeftColor: "#F59E0B" }]}>
              <Text style={[styles.kpiValue, { color: "#F59E0B" }]}>
                {totalReports - resolvedCount}
              </Text>
              <Text style={styles.kpiLabel}>Active</Text>
            </View>
          </View>

          {/* NO DATA STATE */}
          {totalReports === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="shield-checkmark"
                size={48}
                color={Colors.success}
              />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>
                No verified incidents in the last {timeRange} days.
              </Text>
            </View>
          ) : (
            <>
              {/* INCIDENT BREAKDOWN */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pie-chart" size={18} color={Colors.primary} />
                  <Text style={styles.sectionTitle}>Incident Breakdown</Text>
                </View>

                {typeCounts.map((item) => (
                  <View key={item.type} style={styles.barRow}>
                    <View style={styles.barLabel}>
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={item.color}
                      />
                      <Text style={styles.barTypeText}>{item.type}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: item.color,
                            width: `${(item.count / maxCount) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barCount}>{item.count}</Text>
                  </View>
                ))}
              </View>

              {/* HOTSPOT AREAS */}
              {locationCounts.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={Colors.danger}
                    />
                    <Text style={styles.sectionTitle}>Top Areas</Text>
                  </View>

                  {locationCounts.map(([loc, count], i) => (
                    <View key={loc} style={styles.hotspotRow}>
                      <View style={styles.hotspotRank}>
                        <Text style={styles.hotspotRankText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.hotspotText} numberOfLines={1}>
                        {loc}
                      </Text>
                      <View style={styles.hotspotBadge}>
                        <Text style={styles.hotspotCount}>
                          {count} {count === 1 ? "report" : "reports"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* RECENT ACTIVITY */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="time" size={18} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>

                {recentReports.map((r) => (
                  <View key={r.id} style={styles.activityRow}>
                    <View
                      style={[
                        styles.activityDot,
                        {
                          backgroundColor:
                            r.status.toLowerCase() === "resolved"
                              ? Colors.success
                              : "#F59E0B",
                        },
                      ]}
                    />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityType}>
                        {r.incident_type}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {r.location ? `${r.location} · ` : ""}
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        r.status.toLowerCase() === "resolved"
                          ? styles.statusResolved
                          : styles.statusActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          r.status.toLowerCase() === "resolved"
                            ? styles.statusResolvedText
                            : styles.statusActiveText,
                        ]}
                      >
                        {r.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  // Time range selector
  timeRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timeChipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  timeChipText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  timeChipTextActive: { color: "#fff" },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#64748B", fontSize: 14 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // KPI Cards
  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: -1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // Empty state
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  // Section card
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Bar chart
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  barLabel: {
    flexDirection: "row",
    alignItems: "center",
    width: 100,
    gap: 6,
  },
  barTypeText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4 },
  barCount: {
    width: 28,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },

  // Hotspots
  hotspotRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  hotspotRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  hotspotRankText: { fontSize: 11, fontWeight: "800", color: "#64748B" },
  hotspotText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#334155" },
  hotspotBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hotspotCount: { fontSize: 11, fontWeight: "700", color: "#DC2626" },

  // Activity
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityContent: { flex: 1 },
  activityType: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  activityMeta: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusResolved: { backgroundColor: "#ECFDF5" },
  statusActive: { backgroundColor: "#FEF3C7" },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  statusResolvedText: { color: "#059669" },
  statusActiveText: { color: "#D97706" },
});
