import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// IMPORT SAFE AREA FROM CONTEXT
import { useNetInfo } from "@react-native-community/netinfo";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthProvider";

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;

  // 1. ANIMATIONS & LOGIC
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Magandang umaga";
    if (hour < 18) return "Magandang hapon";
    return "Magandang gabi";
  };

  // Fake notification count for demo (set to 0 to hide)
  const notificationCount = 0;

  const firstName =
    session?.user?.user_metadata?.full_name?.split(" ")[0] || "Resident";

  const handleReportPress = () => {
    if (isOffline) {
      router.push("/hotlines");
      return;
    }
    if (!session) {
      setShowLoginModal(true);
    } else {
      router.push("/(tabs)/report");
    }
  };

  const handleSOSPress = () => {
    if (isOffline) {
      router.push("/hotlines");
      return;
    }
    if (!session) {
      setShowLoginModal(true);
      return;
    }
    router.push({
      pathname: "/(tabs)/report",
      params: {
        isSOS: "true",
        type: "Other",
      },
    });
  };

  const handleLoginNavigation = () => {
    setShowLoginModal(false);
    router.replace("/(auth)/login");
  };

  const mainFeatures = [
    {
      id: 1,
      title: "Report Crime",
      description: "For Theft, Fire, Drugs",
      icon: "megaphone",
      color: "#2563EB",
      onPress: handleReportPress,
    },
    {
      id: 2,
      title: "Crime Map",
      description: "Avoid danger zones",
      icon: "map",
      color: "#059669",
      route: "/(tabs)/map",
    },
  ];

  type Feature = {
    id: number;
    title: string;
    description: string;
    icon: string;
    color: string;
    route?: string;
    requiresAuth?: boolean;
    onPress?: () => void;
  };

  const secondaryFeatures: Feature[] = [
    {
      id: 7,
      title: "Blotter Rules",
      description: "Debt & Disputes",
      icon: "reader",
      color: "#0EA5E9",
      route: "/blotter-guide",
    },
    {
      id: 3,
      title: "My Reports",
      description: "Track Status",
      icon: "document-text",
      color: "#EA580C",
      requiresAuth: true,
      route: "/my-reports",
    },
    {
      id: 5,
      title: "Hotlines",
      description: "Emergency #s",
      icon: "call",
      color: "#DC2626",
      route: "/hotlines",
    },
    {
      id: 4,
      title: "Broadcasts",
      description: "News & Alerts",
      icon: "newspaper",
      color: "#8B5CF6",
      route: "/broadcasts",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.headerBrand}>
        <View style={styles.brandContainer}>
          <Image source={require("../../assets/images/icon.png")} style={styles.headerLogo} />
          <View>
            <Text style={styles.brandTitle}>ResponX</Text>
            <Text style={styles.brandSubtitle}>Crime Reporting System</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => Alert.alert("Notifications", "No new notifications")}
        >
          <Ionicons
            name="notifications-outline"
            size={24}
            color={Colors.text.primary}
          />
          {/* HIDE BADGE IF NO NOTIFICATIONS */}
          {notificationCount > 0 && <View style={styles.notificationBadge} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isOffline && (
          <View style={styles.offlineTopBanner}>
            <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
            <Text style={styles.offlineTopText}>
              You are offline. Reporting is disabled, but Emergency Hotlines are available.
            </Text>
          </View>
        )}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{firstName}!</Text>
          <Text style={styles.greetingSubtext}>
            Stay safe and help keep your community secure.
          </Text>
        </View>

        {/* SOS BUTTON */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.sosButton}
            activeOpacity={0.85}
            onPress={handleSOSPress}
          >
            <View style={styles.sosContent}>
              <View style={styles.sosIconCircle}>
                <Ionicons name="alert-circle" size={36} color={Colors.card} />
              </View>
              <View style={styles.sosTextContainer}>
                <Text style={styles.sosTitle}>EMERGENCY SOS</Text>
                <Text style={styles.sosSubtitle}>
                  Tap for immediate assistance
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color="rgba(255,255,255,0.8)"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* INFO BANNER */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="information-circle"
            size={24}
            color={Colors.primary}
            style={styles.infoBannerIcon}
          />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Quick Tip</Text>
            <Text style={styles.infoBannerText}>
              For urgent crimes, use Report Crime. For debts or disputes, check
              Blotter Rules.
            </Text>
          </View>
        </View>

        {/* Main Actions */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="flash" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
        </View>

        <View style={styles.mainFeaturesContainer}>
          {mainFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.mainFeatureCard}
              activeOpacity={0.8}
              onPress={
                feature.onPress || (() => router.push(feature.route as any))
              }
            >
              <View
                style={[
                  styles.mainCardIconContainer,
                  { backgroundColor: feature.color },
                ]}
              >
                <Ionicons
                  name={feature.icon as any}
                  size={32}
                  color={Colors.card}
                />
              </View>
              <Text style={styles.mainCardTitle}>{feature.title}</Text>
              <Text style={styles.mainCardDescription}>
                {feature.description}
              </Text>
              <View
                style={[
                  styles.cardArrow,
                  { backgroundColor: `${feature.color}20` },
                ]}
              >
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={feature.color}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Secondary Services Grid */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="apps" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>More Services</Text>
          </View>
        </View>
        <View style={styles.secondaryGrid}>
          {secondaryFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.secondaryCard}
              onPress={() => {
                if (feature.onPress) {
                  feature.onPress();
                  return;
                }
                if (feature.requiresAuth && !session) {
                  setShowLoginModal(true);
                } else if (feature.route) {
                  // Intercept routes that require internet
                  if (isOffline && feature.route !== "/hotlines" && feature.route !== "/blotter-guide") {
                    Alert.alert("Offline", "This feature is not available without an internet connection.");
                    return;
                  }
                  router.push(feature.route as any);
                }
              }}
            >
              <View
                style={[
                  styles.secondaryIconContainer,
                  { backgroundColor: `${feature.color}15` },
                ]}
              >
                <Ionicons
                  name={feature.icon as any}
                  size={28}
                  color={feature.color}
                />
              </View>
              <Text style={styles.secondaryCardTitle}>{feature.title}</Text>
              <Text style={styles.secondaryCardDescription}>
                {feature.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Login Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLoginModal}
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="lock-closed" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Login Required</Text>
            <Text style={styles.modalMessage}>
              You need to be logged in to use this feature. Please sign in or
              create an account.
            </Text>

            <TouchableOpacity
              style={styles.modalLoginButton}
              onPress={handleLoginNavigation}
            >
              <Text style={styles.modalLoginText}>Login / Register</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowLoginModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  headerBrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#F8FAFC", // Match bg
  },
  brandContainer: { flexDirection: "row", alignItems: "center" },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  brandTitle: { fontSize: 20, fontWeight: "bold", color: Colors.primary },
  brandSubtitle: { fontSize: 11, color: Colors.text.secondary, marginTop: 2 },
  notificationButton: {
    width: 44,
    height: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  greetingSection: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  greeting: { fontSize: 16, color: Colors.text.secondary, fontWeight: "500" },
  name: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginTop: 4,
    marginBottom: 8,
  },
  greetingSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  sosButton: {
    backgroundColor: Colors.danger,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    elevation: 8,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  sosContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  sosIconCircle: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sosTextContainer: { flex: 1 },
  sosTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  sosSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },

  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#F0F9FF",
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    // Removed border for cleaner look
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  offlineTopBanner: {
    backgroundColor: Colors.danger,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
  },
  offlineTopText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 8,
    flex: 1,
  },
  infoBannerIcon: { marginRight: 12, marginTop: 2 },
  infoBannerContent: { flex: 1 },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: "#0c4a6e",
    lineHeight: 18,
  },

  sectionHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  sectionTitleContainer: { flexDirection: "row", alignItems: "center" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
    marginLeft: 8,
  },
  mainFeaturesContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  mainFeatureCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  mainCardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  mainCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: 6,
    textAlign: "center",
  },
  mainCardDescription: {
    fontSize: 11,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 16,
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    justifyContent: "space-between", // Ensures 2 columns are spaced evenly
    marginBottom: 40,
  },
  secondaryCard: {
    backgroundColor: "#fff",
    width: "48%", // 2 columns
    aspectRatio: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  secondaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
  },
  secondaryCardDescription: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    elevation: 10,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalLoginButton: {
    backgroundColor: Colors.primary,
    width: "100%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  modalLoginText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalCancelButton: { padding: 12 },
  modalCancelText: {
    color: Colors.text.secondary,
    fontSize: 15,
    fontWeight: "600",
  },
});
