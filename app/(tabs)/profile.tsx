import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ModalPicker from "../../components/ModalPicker"; // Reusing your existing component
import { Colors } from "../../constants/Colors";
import { supabase } from "../../lib/supabase";

// Same list as Report screen
const BARANGAY_LIST = [
  "Canlubang",
  "Mayapa",
  "Mapagong",
  "Sirang Lupa",
  "Real",
  "Calamba City",
];

export default function ProfileScreen() {
  const router = useRouter();

  // User Data
  const [profile, setProfile] = useState<any>(null);
  const [myBarangay, setMyBarangay] = useState("Not Set");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get profile data (including jurisdiction/barangay)
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setMyBarangay(data.jurisdiction || "Not Set");
    }
  };

  const updateBarangay = async (selected: string) => {
    setMyBarangay(selected);
    setShowPicker(false);

    const { error } = await supabase
      .from("profiles")
      .update({ jurisdiction: selected }) // We save residency in 'jurisdiction' column
      .eq("id", profile.id);

    if (error) {
      Alert.alert("Error", "Failed to update barangay.");
    } else {
      Alert.alert("Success", `You are now receiving updates for ${selected}.`);
      fetchProfile();
    }
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#CBD5E1" />
        </View>
        <Text style={styles.emailText}>{profile?.full_name || "Resident"}</Text>
        <Text style={styles.roleText}>{profile?.email}</Text>

        {/* RESIDENCY BADGE */}
        <View style={styles.badge}>
          <Ionicons name="location" size={12} color="#fff" />
          <Text style={styles.badgeText}>{myBarangay}</Text>
        </View>
      </View>

      <View style={styles.section}>
        {/* EDIT BARANGAY BUTTON */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setShowPicker(true)}
        >
          <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="home" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.menuText}>Set My Barangay</Text>
            <Text style={styles.subText}>Used for alerts & broadcasts</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/my-reports")}
        >
          <View style={[styles.iconBox, { backgroundColor: "#FFF7ED" }]}>
            <Ionicons name="document-text" size={20} color="#EA580C" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.menuText}>My Reports</Text>
            <Text style={styles.subText}>Check status history</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* BARANGAY PICKER MODAL */}
      <ModalPicker
        visible={showPicker}
        title="Select Your Barangay"
        options={BARANGAY_LIST}
        onClose={() => setShowPicker(false)}
        onSelect={(item) =>
          updateBarangay(typeof item === "string" ? item : item.label)
        }
        hasSearch
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: 20,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.text.primary },
  profileCard: {
    alignItems: "center",
    padding: 30,
    backgroundColor: Colors.card,
    marginBottom: 20,
  },
  avatarContainer: { marginBottom: 10 },
  emailText: { fontSize: 20, fontWeight: "700", color: Colors.text.primary },
  roleText: { fontSize: 14, color: Colors.text.secondary, marginBottom: 12 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  section: {
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuText: { fontSize: 16, color: "#0F172A", fontWeight: "600" },
  subText: { fontSize: 12, color: "#64748B", marginTop: 2 },
  logoutButton: {
    margin: 20,
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  logoutText: { color: Colors.danger, fontWeight: "bold", fontSize: 16 },
});
