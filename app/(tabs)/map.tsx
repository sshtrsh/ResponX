import { Ionicons } from "@expo/vector-icons";
import { formatDistanceToNow } from "date-fns";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { supabase } from "../../lib/supabase";

// --- TYPES ---
type Report = {
  id: string;
  incident_type: string;
  latitude: number;
  longitude: number;
  created_at: string;
  description: string;
  location: string;
  priority: string;
  status: string;
};

// --- CONFIG ---
const INITIAL_REGION = {
  latitude: 14.2142,
  longitude: 121.1661,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const FILTERS = [
  "All",
  "Fire",
  "Medical",
  "Accident",
  "Assault",
  "Drugs",
  "Theft",
  "Vandalism",
  "Others",
];

const CLEAN_MAP_STYLE = [
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  // Fix 1: Safe area insets for FAB positioning (avoids notch/Dynamic Island)
  const insets = useSafeAreaInsets();
  // Fix 2: Track setTimeout so it can be cleared on unmount
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [recentAlert, setRecentAlert] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  // Fix 3 & 4: Banner states
  const [locationDenied, setLocationDenied] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Performance
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  // Fix 2: Helper to show live alert with proper timer cleanup
  const showAlert = useCallback((report: Report) => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    setRecentAlert(report);
    alertTimerRef.current = setTimeout(() => setRecentAlert(null), 6000);
  }, []);

  // Fix 5 & 7: useCallback + try/catch on getUserLocation
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true); // Fix 3
        return;
      }
      setLocationDenied(false);

      const location = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
      // Fix 8: Animate map to user location (initialRegion only works on first render)
      mapRef.current?.animateToRegion(region, 800);
    } catch {
      // Ignored
    }
  }, []);

  // Fix 6: useCallback on fetchReports + Fix 4: error state
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, incident_type, latitude, longitude, created_at, priority, status, description, location",
      )
      .in("status", ["Verified", "Resolved", "verified", "resolved"])
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setFetchError(true); // Fix 4
    }
    if (data) setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchReports();

    // ⚡ Real-time listener (with Fix 2 & 10)
    const subscription = supabase
      .channel("public:reports")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload) => {
          const record = payload.new as Report;

          const status = record.status
            ? record.status.charAt(0).toUpperCase() +
            record.status.slice(1).toLowerCase()
            : "";

          const isVerified = ["Verified", "Resolved"].includes(status);

          // CASE 1: NEW REPORT
          if (payload.eventType === "INSERT") {
            if (isVerified) {
              setReports((prev) => [record, ...prev]);
              // Fix 10: Side effect OUTSIDE the updater
              showAlert(record);
            }
          }
          // CASE 2: STATUS UPDATE
          else if (payload.eventType === "UPDATE") {
            if (isVerified) {
              // Fix 10: Track if report is newly visible (pure updater)
              let isNewlyVisible = false;
              setReports((prev) => {
                const exists = prev.find((r) => r.id === record.id);
                if (exists) {
                  return prev.map((r) => (r.id === record.id ? record : r));
                }
                isNewlyVisible = true;
                return [record, ...prev];
              });
              // Fix 10: Side effect OUTSIDE updater
              if (isNewlyVisible) showAlert(record);
            } else {
              setReports((prev) => prev.filter((r) => r.id !== record.id));
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      // Fix 2: Clear alert timer on unmount (prevents state-on-unmounted)
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, [fetchReports, showAlert]);

  // Performance Optimization
  useEffect(() => {
    if (reports.length > 0) {
      setTracksViewChanges(true);
      const timer = setTimeout(() => setTracksViewChanges(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [reports]);

  // --- LOGIC ---

  const displayedReports = useMemo(() => {
    return activeFilter === "All"
      ? reports
      : reports.filter((r) => r.incident_type === activeFilter);
  }, [activeFilter, reports]);

  const getMarkerColor = (report: Report) => {
    const status = report.status?.toLowerCase() || "";
    if (status === "resolved") return "#10B981";

    const hoursOld =
      (new Date().getTime() - new Date(report.created_at).getTime()) /
      (1000 * 60 * 60);

    if (hoursOld < 2) return "#EF4444";
    if (report.priority === "High") return "#F87171";
    return "#CBD5E1";
  };

  const getPinIcon = (type: string) => {
    const map: Record<string, string> = {
      Fire: "flame",
      Theft: "alert-circle",
      Assault: "hand-left",
      Medical: "medkit",
      Accident: "car",
      Drugs: "skull",
      Vandalism: "hammer",
    };
    return map[type] || "location";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Fix 12: Always render MapView — show overlay spinner instead of hiding map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={CLEAN_MAP_STYLE}
        onPress={() => setSelectedReport(null)}
      >
        {displayedReports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.latitude,
              longitude: report.longitude,
            }}
            tracksViewChanges={tracksViewChanges}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedReport(report);
            }}
          >
            <View
              style={[
                styles.markerBadge,
                { backgroundColor: getMarkerColor(report) },
              ]}
            >
              <Ionicons
                name={getPinIcon(report.incident_type) as any}
                size={14}
                color="white"
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Fix 12: Translucent loading overlay (map still visible behind) */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingOverlayText}>Loading reports…</Text>
        </View>
      )}

      {/* Fix 3: Location denied — dismissable amber banner */}
      {locationDenied && !selectedReport && (
        <View
          style={[styles.statusBanner, styles.warningBanner, { top: insets.top + 56 }]}
        >
          <Ionicons name="location-outline" size={16} color="#92400E" />
          <Text style={styles.warningBannerText}>
            Enable location to see reports near you
          </Text>
          <TouchableOpacity onPress={() => setLocationDenied(false)}>
            <Ionicons name="close" size={16} color="#92400E" />
          </TouchableOpacity>
        </View>
      )}

      {/* Fix 4: Fetch error — red banner with "Tap to retry" */}
      {fetchError && !selectedReport && (
        <View
          style={[styles.statusBanner, styles.errorBanner, { top: insets.top + 56 }]}
        >
          <Ionicons name="cloud-offline-outline" size={16} color="#991B1B" />
          <Text style={styles.errorBannerText}>Failed to load reports</Text>
          <TouchableOpacity onPress={fetchReports}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 🚨 LIVE TICKER */}
      {recentAlert && (
        <View style={styles.liveAlert}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <View>
            <Text style={styles.alertTitle}>
              New {recentAlert.incident_type} Verified
            </Text>
            <Text style={styles.alertLoc}>{recentAlert.location}</Text>
          </View>
        </View>
      )}

      {/* CONTROLS — Fix 1: FAB uses safe area insets instead of hardcoded top: 60 */}
      <View style={[styles.fabContainer, { top: insets.top + 12 }]}>
        <TouchableOpacity style={styles.fabButton} onPress={fetchReports}>
          <Ionicons name="refresh" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fabButton, { marginTop: 10 }]}
          onPress={() => {
            getUserLocation();
          }}
        >
          <Ionicons name="locate" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* FILTER BAR */}
      {!selectedReport && !recentAlert && (
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  activeFilter === filter && { backgroundColor: "#0F172A" },
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter && { color: "white" },
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Fix 13: Empty filter state — small banner when no results */}
      {!selectedReport && !loading && displayedReports.length === 0 && (
        <View style={styles.emptyBanner}>
          <Text style={styles.emptyBannerText}>
            No {activeFilter !== "All" ? activeFilter + " " : ""}reports in
            this area
          </Text>
        </View>
      )}

      {/* BOTTOM DETAIL CARD */}
      {selectedReport && (
        <View style={styles.infoCardContainer}>
          <View style={styles.infoCardHeader}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: getMarkerColor(selectedReport) },
              ]}
            >
              <Ionicons
                name={getPinIcon(selectedReport.incident_type) as any}
                size={24}
                color="white"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {selectedReport.incident_type}
              </Text>
              <Text style={styles.infoDate}>
                {formatDistanceToNow(new Date(selectedReport.created_at), {
                  addSuffix: true,
                })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedReport(null)}>
              <Ionicons name="close-circle" size={28} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.infoLabel}>
            STATUS:{" "}
            <Text
              style={{
                color:
                  selectedReport.status?.toLowerCase() === "resolved"
                    ? "#10B981"
                    : "#F59E0B",
              }}
            >
              {selectedReport.status}
            </Text>
          </Text>
          <Text style={styles.infoDesc} numberOfLines={3}>
            {selectedReport.description}
          </Text>
          {/* Fix 14: Ionicons outside Text */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={12} color="#64748B" />
            <Text style={styles.locationText}>{selectedReport.location}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },

  // Fix 12: Loading overlay (translucent, map visible behind)
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingOverlayText: { marginTop: 10, color: "#64748B", fontSize: 14 },

  // MARKER
  markerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },

  // Fix 3 & 4: Status banners
  statusBanner: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningBanner: { backgroundColor: "#FEF3C7" },
  warningBannerText: { flex: 1, fontSize: 13, color: "#92400E", fontWeight: "500" },
  errorBanner: { backgroundColor: "#FEE2E2" },
  errorBannerText: { flex: 1, fontSize: 13, color: "#991B1B", fontWeight: "500" },
  retryText: {
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  // LIVE TICKER
  liveAlert: {
    position: "absolute",
    bottom: 110,
    left: 20,
    right: 20,
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    elevation: 10,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
    marginRight: 6,
  },
  liveText: { color: "white", fontSize: 10, fontWeight: "bold" },
  alertTitle: { color: "white", fontWeight: "bold", fontSize: 14 },
  alertLoc: { color: "#94A3B8", fontSize: 12 },

  // FAB (Fix 1: no hardcoded top — uses insets in JSX)
  fabContainer: { position: "absolute", right: 20 },
  fabButton: {
    backgroundColor: "white",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
  },

  // FILTER BAR
  filterContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
  filterChip: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  filterText: { fontSize: 12, fontWeight: "600", color: "#475569" },

  // Fix 13: Empty filter state
  emptyBanner: {
    position: "absolute",
    bottom: 100,
    left: 40,
    right: 40,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  emptyBannerText: { color: "#fff", fontSize: 13, fontWeight: "500" },

  // BOTTOM CARD
  infoCardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 15,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  infoDate: { fontSize: 12, color: "#64748B" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 15 },
  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 5,
  },
  infoDesc: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    marginBottom: 10,
  },
  // Fix 14: Ionicons outside Text
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12, color: "#64748B", fontStyle: "italic", flex: 1 },
});
