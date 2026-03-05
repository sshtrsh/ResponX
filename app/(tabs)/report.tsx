import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import NetInfo from "@react-native-community/netinfo";
import { decode } from "base64-arraybuffer"; // 📦 Requires: npm install base64-arraybuffer
import { readAsStringAsync } from "expo-file-system/legacy"; // Migrating to legacy API for Expo 54
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LocationPickerModal from "../../components/LocationPickerModal";
import ModalPicker from "../../components/ModalPicker";
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthProvider";
import { supabase } from "../../lib/supabase";

// --- 1. SIMPLIFIED INCIDENT LIST (With Colors) ---
const INCIDENT_TYPES = [
  {
    label: "Fire - House/Building",
    value: "Fire",
    icon: "flame",
    color: "#EF4444",
  },
  {
    label: "Medical Emergency",
    value: "Medical",
    icon: "medkit",
    color: "#EF4444",
  },
  { label: "Car Accident", value: "Accident", icon: "car", color: "#F97316" },
  {
    label: "Physical Assault",
    value: "Assault",
    icon: "hand-left",
    color: "#F97316",
  },
  {
    label: "Robbery",
    value: "Robbery",
    icon: "cash",
    color: "#EF4444",
  },
  {
    label: "Homicide",
    value: "Homicide",
    icon: "skull",
    color: "#DC2626",
  },
  { label: "Drug Activity", value: "Drugs", icon: "flask", color: "#8B5CF6" },
  {
    label: "Theft / Robbery",
    value: "Theft",
    icon: "alert-circle",
    color: "#EAB308",
  },
  {
    label: "Vandalism",
    value: "Vandalism",
    icon: "color-palette",
    color: "#3B82F6",
  },
  {
    label: "Fraud / Scam",
    value: "Fraud",
    icon: "document-text",
    color: "#F59E0B",
  },
  {
    label: "Sexual Assault",
    value: "Sexual Assault",
    icon: "shield",
    color: "#EC4899",
  },
  {
    label: "Kidnapping",
    value: "Kidnapping",
    icon: "people",
    color: "#6366F1",
  },
  {
    label: "Trespassing",
    value: "Trespassing",
    icon: "warning",
    color: "#64748B",
  },
  {
    label: "Others / Minor Incident",
    value: "Others",
    icon: "help-circle",
    color: "#64748B",
  },
] as const;

const DEFAULT_BARANGAY_COORDS: Record<string, { lat: number; lng: number }> = {
  Canlubang: { lat: 14.2110, lng: 121.0980 },
  Mayapa: { lat: 14.2200, lng: 121.1380 },
  Mapagong: { lat: 14.2290, lng: 121.1240 },
  "Sirang Lupa": { lat: 14.2060, lng: 121.1180 },
  Real: { lat: 14.2050, lng: 121.1570 },
  "La Mesa": { lat: 14.1820, lng: 121.1430 },
  Bucal: { lat: 14.1800, lng: 121.1720 },
  Pansol: { lat: 14.1750, lng: 121.1580 },
};

// Find nearest barangay by GPS coordinates using Haversine distance.
// Returns empty string if the nearest barangay is more than 25 km away
// (prevents false snapping when the user is outside the service area).
const EARTH_RADIUS_KM = 6371;
const MAX_BARANGAY_DISTANCE_KM = 25;

const findNearestBarangay = (lat: number, lng: number, barangayCoords: Record<string, { lat: number, lng: number }>): string => {
  const list = Object.keys(barangayCoords);
  if (list.length === 0) return "";

  let nearest = list[0];
  let minDistKm = Infinity;

  for (const [name, coords] of Object.entries(barangayCoords)) {
    const dLat = ((coords.lat - lat) * Math.PI) / 180;
    const dLng = ((coords.lng - lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) *
      Math.cos((coords.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    // Multiply by Earth radius to get actual km distance
    const distKm = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (distKm < minDistKm) {
      minDistKm = distKm;
      nearest = name;
    }
  }

  // Sanity check: don't snap to a barangay if we're clearly outside the service area
  if (minDistKm > MAX_BARANGAY_DISTANCE_KM) return "";

  return nearest;
};

export default function ReportScreen() {
  const router = useRouter();
  const navigation = useNavigation(); // Required for "Unsaved Changes" check
  const { session } = useAuth();
  const params = useLocalSearchParams();

  // FORM STATE
  const [dynamicBarangays, setDynamicBarangays] = useState<string[]>(Object.keys(DEFAULT_BARANGAY_COORDS));
  const [barangayCoordsMap, setBarangayCoordsMap] = useState<Record<string, { lat: number, lng: number }>>(DEFAULT_BARANGAY_COORDS);
  const [crimeType, setCrimeType] = useState("");
  const [customIncident, setCustomIncident] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [barangay, setBarangay] = useState("");
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittedRef = useRef(false); // Fix closure timing on success navigate

  // DATE/TIME PICKER STATE
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateTimeObj, setDateTimeObj] = useState(new Date());

  const scrollViewRef = useRef<ScrollView>(null);

  // DRAFTS: Save/Restore functionality
  const DRAFT_KEY = "@report_draft";
  const [isDraftRestoring, setIsDraftRestoring] = useState(true);

  // MAP STATE
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 14.1953, lng: 121.1449 }); // Default to La Mesa
  const [isManual, setIsManual] = useState(false);

  // UI STATE
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [brgyPickerVisible, setBrgyPickerVisible] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'denied' | 'error'>('idle');
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [showAllFields, setShowAllFields] = useState(false);
  // SOS MODE: Success confirmation state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // DERIVED STATE
  const isSOS = params.isSOS === "true";
  const isExpressMode = isSOS && !showAllFields;

  // --- EFFECT: UNSAVED CHANGES PROTECTION ---
  useEffect(() => {
    const hasUnsavedChanges =
      !isSubmitting &&
      !submittedRef.current &&
      (crimeType || description || location || images.length > 0 || customIncident);

    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (!hasUnsavedChanges) {
        // If we don't have changes, or we are submitting, continue naturally
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Prompt the user
      Alert.alert(
        "Discard Report?",
        "You have unsaved changes. Are you sure you want to discard them?",
        [
          { text: "Don't leave", style: "cancel", onPress: () => { } },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => navigation.dispatch(e.data.action as any),
          },
        ],
      );
    });

    return unsubscribe;
  }, [
    navigation,
    isSubmitting,
    crimeType,
    description,
    location,
    images,
    customIncident,
  ]);

  // --- EFFECT: PRIMARY MOUNT & DRAFT HYDRATION ---
  useEffect(() => {
    if (!session) {
      Alert.alert("Login Required", "Please login to report.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }

    // Load static list of authorized barangays with fallback coordinates
    const loadBarangays = async () => {
      try {
        const fetchedNames = ["Canlubang", "Mapagong", "Mayapa", "Real", "Bucal", "Pansol", "Sirang Lupa", "La Mesa"];
        const newCoordsMap: Record<string, { lat: number, lng: number }> = {};

        fetchedNames.forEach(name => {
          newCoordsMap[name] = DEFAULT_BARANGAY_COORDS[name] || { lat: 14.2142, lng: 121.1661 };
        });

        // Merge local defaults with any new ones
        const allOptions = Array.from(new Set([...Object.keys(DEFAULT_BARANGAY_COORDS), ...fetchedNames]));
        setDynamicBarangays(allOptions.sort());

        setBarangayCoordsMap({ ...DEFAULT_BARANGAY_COORDS, ...newCoordsMap });
      } catch {
        // Ignored
      }
    };

    loadBarangays();
    fetchCurrentLocation();
    fillCurrentDateTime();

    // Draft Hydrator — skip entirely in SOS mode to avoid overwriting SOS pre-fills
    const loadDraft = async () => {
      try {
        const savedDraft = await AsyncStorage.getItem(DRAFT_KEY);
        // FIX: Never restore a draft while in SOS mode — it would overwrite
        // crimeType="Others" + customIncident="SOS Emergency" with stale data.
        if (savedDraft && !isSOS) {
          Alert.alert(
            "Unsaved Report Found",
            "You have an incomplete report from a previous session. Would you like to restore it?",
            [
              {
                text: "Discard",
                style: "destructive",
                onPress: () => AsyncStorage.removeItem(DRAFT_KEY),
              },
              {
                text: "Restore",
                onPress: () => {
                  const draft = JSON.parse(savedDraft);
                  if (draft.crimeType) setCrimeType(draft.crimeType);
                  if (draft.customIncident) setCustomIncident(draft.customIncident);
                  if (draft.description) setDescription(draft.description);
                  if (draft.location) setLocation(draft.location);
                  if (draft.barangay) setBarangay(draft.barangay);
                  if (draft.reporterName) setReporterName(draft.reporterName);
                  if (draft.contactNumber) setContactNumber(draft.contactNumber);
                  if (draft.anonymous !== undefined) setAnonymous(draft.anonymous);
                },
              },
            ]
          );
        }
      } catch {
        // Ignored
      } finally {
        setIsDraftRestoring(false);
      }
    };
    loadDraft();

    if (isSOS) {
      setCrimeType("Others");
      setCustomIncident("SOS Emergency");
      setDescription(""); // Leave blank so user can type fast, no annoying prepopulated text
      setAnonymous(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- EFFECT: AUTO-SAVE DRAFT ---
  useEffect(() => {
    if (isDraftRestoring || isSOS) return; // Don't save while restoring or in express mode

    const saveTimeout = setTimeout(() => {
      const draftData = {
        crimeType,
        customIncident,
        description,
        location,
        barangay,
        reporterName,
        contactNumber,
        anonymous,
      };

      // Only save if dirty
      if (crimeType || description || location) {
        AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draftData)).catch(() => {
          // Ignored
        });
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [
    crimeType,
    customIncident,
    description,
    location,
    barangay,
    reporterName,
    contactNumber,
    anonymous,
    isDraftRestoring,
    isSOS,
  ]);

  // SOS MODE: Countdown timer for success modal auto-navigation
  useEffect(() => {
    if (!showSuccessModal) return;
    if (countdown <= 0) {
      setShowSuccessModal(false);
      router.replace("/(tabs)");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuccessModal, countdown]);

  // --- LOGIC ---

  const handleSelectBarangay = (item: any) => {
    const name = typeof item === "string" ? item : item.label;
    setBarangay(name);
    setIsAutoDetected(false); // User manually picked it
    if (barangayCoordsMap[name]) setMapCenter(barangayCoordsMap[name]);
  };

  const handleSelectType = (item: any) => {
    setCrimeType(item.value);
    if (item.value !== "Others") setCustomIncident("");
  };

  const getPriority = (typeValue: string) => {
    if (["Fire", "Medical", "Accident", "Assault", "Homicide", "Kidnapping", "Sexual Assault"].includes(typeValue))
      return "High";
    if (["Drugs", "Theft", "Robbery", "Fraud", "Trespassing"].includes(typeValue)) return "Medium";
    return "Low";
  };

  const fetchCurrentLocation = async (force = false) => {
    try {
      if (isManual && !force) return;
      setGpsStatus('loading');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsStatus('denied');
        // SOS MODE: Alert on GPS denial in emergency
        if (isSOS) Alert.alert("Could not detect location", "Please type your address below.");
        return;
      }

      // SOS MODE: Use highest accuracy for emergencies
      const pos = await Location.getCurrentPositionAsync({
        accuracy: isSOS ? Location.Accuracy.Highest : Location.Accuracy.High,
      });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);

      // FIX: If the user has already pinned a manual location (isManual=true) while GPS was
      // resolving in the background, do NOT overwrite their chosen barangay with the GPS result.
      if (!isManual || force) {
        await detectAndSetBarangay(pos.coords.latitude, pos.coords.longitude);
      }
      setGpsStatus('success');
    } catch {
      setGpsStatus('error');
      // SOS MODE: Always alert on GPS failure in emergency
      if (isSOS) {
        Alert.alert("Could not detect location", "Please type your address manually.");
      } else if (force) {
        Alert.alert("Error", "Could not get GPS. Please enter your location manually.");
      }
    }
  };

  const detectAndSetBarangay = async (lat: number, lng: number) => {
    // BARANGAY: Always use nearest-by-distance — more reliable than geocoder
    // text matching in PH where district/subregion fields are inconsistent.
    const nearest = findNearestBarangay(lat, lng, barangayCoordsMap);
    setBarangay(nearest);
    setIsAutoDetected(true);

    // STREET/LANDMARK: Still use geocoder but ONLY for the street name.
    // If it fails, just leave the street field empty for the user to type.
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (addresses.length > 0) {
        const addr = addresses[0];
        const street = addr.street || addr.name || "";
        setLocation(street); // Only the street — barangay goes in its own field
      }
      // If no result, leave location field empty — don't put garbage in it
    } catch {
      // Geocode failed — barangay is already set above, street stays empty
    }
  };

  const pickImage = async () => {
    // Guard cumulative limit before opening picker — the JSX hides the button but
    // there's a brief window between re-renders where this could be called with 4 images.
    if (images.length >= 4) return;

    Alert.alert(
      "Attach Evidence",
      "Choose a photo source",
      [
        {
          text: "Camera",
          onPress: async () => {
            if (images.length >= 4) return; // Re-check inside async callback
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              return Alert.alert("Permission Required", "Please allow camera access to take photos.");
            }
            const res = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.5,
              allowsMultipleSelection: false, // Core Camera mode only takes one at a time for safety
            });
            if (!res.canceled) {
              setImages((prev) => prev.length < 4 ? [...prev, res.assets[0].uri] : prev);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              return Alert.alert("Permission Required", "Please allow camera roll access to attach photos.");
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.5,
              allowsMultipleSelection: true,
              selectionLimit: 4,
            });
            if (!res.canceled) {
              const newUris = res.assets.map(a => a.uri);
              setImages((prev) => {
                const remaining = 4 - prev.length;
                return [...prev, ...newUris.slice(0, remaining)];
              });
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // ✅ FIXED: Reliable Upload for Android + Private Bucket Compatible
  const uploadImage = async (uri: string, userId: string): Promise<string | null> => {
    try {
      const ext = uri.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${ext}`;

      // 1. Read file as Base64 using the legacy filesystem API
      const base64 = await readAsStringAsync(uri, {
        encoding: "base64",
      });

      // 2. Upload using ArrayBuffer (Works on Android/iOS)
      const { error } = await supabase.storage
        .from("evidence")
        .upload(fileName, decode(base64), {
          contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
          upsert: false,
        });

      if (error) throw error;

      // 3. Return the storage PATH (not the public URL).
      //    This works with both public and private buckets.
      //    Signed URLs are generated at view-time by the admin dashboard (evidenceUrl.ts).
      return fileName;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!session) return Alert.alert("Session Expired", "Please log in again to submit a report.");

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return Alert.alert(
        "No Internet Connection",
        "You are offline. Your report has been saved as a draft locally. Please find a network connection and try submitting again."
      );
    }

    // 1. Validation
    if (crimeType === "Others" && !customIncident.trim()) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return Alert.alert(
        "Missing Info",
        "Please specify the incident details.",
      );
    }
    if (!crimeType || !location || !barangay || (!isSOS && description.length < 5)) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return Alert.alert("Missing Info", "Please fill in all required fields. Description needs at least 5 characters.");
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;

    if (!dateRegex.test(date)) {
      return Alert.alert("Invalid Date", "Use YYYY-MM-DD format");
    }
    if (!timeRegex.test(time)) {
      return Alert.alert("Invalid Time", "Use HH:MM format");
    }

    const parsedDate = new Date(`${date}T${time}`);
    if (isNaN(parsedDate.getTime())) {
      return Alert.alert("Invalid DateTime", "Please enter a valid, real calendar date and time.");
    }

    setIsSubmitting(true);

    try {
      // 2. Image Upload (Batch mapped Promise)
      let uploadedPaths: string[] | null = null;

      if (images.length > 0) {
        setUploadPhase('uploading');
        const urls = await Promise.all(images.map(img => uploadImage(img, session!.user.id)));

        // Separate successes from failures
        const validUrls = urls.filter((url): url is string => url !== null);
        const failedCount = urls.length - validUrls.length;

        if (validUrls.length === 0) {
          // All uploads failed — block submission
          Alert.alert("Upload Failed", "Could not upload any photos. Please check your connection and try again.");
          setIsSubmitting(false);
          setUploadPhase('idle');
          return;
        }

        // Partial failure — warn but continue with successfully uploaded photos
        if (failedCount > 0) {
          Alert.alert(
            "Partial Upload",
            `${failedCount} photo${failedCount > 1 ? 's' : ''} could not be uploaded. Your report will be submitted with ${validUrls.length} of ${urls.length} photos.`
          );
        }

        // image_url is a native text[] column — pass the array directly
        uploadedPaths = validUrls;
      }

      // 3. Prepare Data
      setUploadPhase('saving');
      const finalType = crimeType === "Others" ? customIncident : crimeType;
      const finalLoc = [location, barangay].filter(Boolean).join(", ") || "Unknown Location";

      // 4. Insert to Supabase
      const { data, error } = await supabase.from("reports").insert([
        {
          user_id: session!.user.id,
          incident_type: finalType,
          incident_date: date,
          incident_time: time,
          location: finalLoc,
          // Persist barangay so RLS can filter barangay_admin access by jurisdiction.
          // Determined by detectAndSetBarangay() before submission.
          barangay: barangay || null,
          description,
          reporter_name: anonymous ? "Anonymous" : reporterName,
          contact_number: anonymous ? null : contactNumber,
          is_anonymous: anonymous,
          latitude,
          longitude,
          image_url: uploadedPaths,
          status: "Pending",
          // SOS MODE: Always set priority to High for emergency reports
          priority: isSOS ? "High" : getPriority(crimeType),
        },
      ]).select();

      if (error) throw error;

      // 5. Cleanup
      await AsyncStorage.removeItem(DRAFT_KEY);

      // Set synchronous flag to bypass beforeRemove listener immediately
      submittedRef.current = true;

      // SOS MODE: Show full-screen success confirmation instead of alert
      if (isSOS) {
        setCountdown(5);
        setShowSuccessModal(true);
      } else {
        router.replace({ pathname: '/report-success', params: { id: data[0].id } } as any);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSubmitting(false);
      setUploadPhase('idle');
    }
  };

  const fillCurrentDateTime = () => {
    const now = new Date();
    setDateTimeObj(now);
    setDate(now.toISOString().split("T")[0]);
    setTime(now.toTimeString().substring(0, 5));
  };

  const selectedIncident = INCIDENT_TYPES.find((t) => t.value === crimeType);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Report</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* SOS MODE: Express mode banner with priority badge */}
          {isSOS && (
            <View style={styles.sosBanner}>
              <View style={styles.sosBannerContent}>
                <Ionicons name="alert-circle" size={24} color="#DC2626" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.sosBannerTitle}>🚨 SOS Emergency Mode</Text>
                  <Text style={styles.sosBannerText}>
                    Form simplified for speed. Priority locked to Critical.
                  </Text>
                </View>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityBadgeText}>🔴 Critical</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAllFields(!showAllFields)}>
                <Text style={styles.showAllFieldsLink}>
                  {isExpressMode ? "Show all fields" : "Collapse fields"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* INCIDENT TYPE SELECTOR */}
          <Text style={styles.label}>Incident Type <Text style={{ color: 'red' }}>*</Text></Text>
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => setTypePickerVisible(true)}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {selectedIncident ? (
                <View
                  style={[
                    styles.miniIcon,
                    { backgroundColor: selectedIncident.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={selectedIncident.icon as any}
                    size={18}
                    color={selectedIncident.color}
                  />
                </View>
              ) : (
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#94A3B8"
                />
              )}
              <Text style={styles.inputText}>
                {selectedIncident?.label || "Select Incident"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {/* OTHERS INPUT */}
          {crimeType === "Others" && (
            <TextInput
              style={styles.input}
              value={customIncident}
              onChangeText={setCustomIncident}
              placeholder="Specify incident (e.g. Lost Dog, Noise Complaint)"
              autoFocus
            />
          )}

          {/* BARANGAY — hidden in express mode */}
          {!isExpressMode && (
            <>
              <View style={styles.barangayLabelRow}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Barangay</Text>
                {isAutoDetected && (
                  <View style={styles.autoDetectBadge}>
                    <Ionicons name="location" size={12} color="#059669" />
                    <Text style={styles.autoDetectText}>Auto-detected</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.inputBox}
                onPress={() => setBrgyPickerVisible(true)}
              >
                <Text style={styles.inputText}>
                  {barangay || "Select Barangay"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Note: Auto-detected locations may sometimes be inaccurate. Please double-check and change manually if needed.
              </Text>
            </>
          )}

          {/* DATE & TIME — auto-filled, hidden in express mode */}
          {!isExpressMode && (
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Date <Text style={{ color: 'red' }}>*</Text></Text>
                <TouchableOpacity style={styles.inputBox} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.inputText}>{date}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Time <Text style={{ color: 'red' }}>*</Text></Text>
                <TouchableOpacity style={styles.inputBox} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.inputText}>{time}</Text>
                  <Ionicons name="time-outline" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={dateTimeObj}
              mode="date"
              display="default"
              onChange={(e, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDateTimeObj(selectedDate);
                  setDate(selectedDate.toISOString().split("T")[0]);
                }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={dateTimeObj}
              mode="time"
              display="default"
              onChange={(e, selectedDate) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDateTimeObj(selectedDate);
                  setTime(selectedDate.toTimeString().substring(0, 5));
                }
              }}
            />
          )}

          {/* LOCATION */}
          <Text style={styles.label}>Street / Landmark <Text style={{ color: 'red' }}>*</Text></Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }, (gpsStatus === 'denied' || gpsStatus === 'error') && styles.inputWarning]}
              value={location}
              onChangeText={setLocation}
              placeholder="Street / Landmark"
            />
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowMapPicker(true)}
              accessibilityLabel="Open map view"
            >
              <Ionicons name="map" size={22} color="#0284C7" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                setIsManual(false);
                fetchCurrentLocation(true);
              }}
              accessibilityLabel="Use current GPS location"
            >
              <Ionicons name="locate" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* GPS STATUS FEEDBACK */}
          {gpsStatus === 'loading' && (
            <View style={styles.gpsStatusRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.gpsStatusText}>📍 Getting your location…</Text>
            </View>
          )}
          {gpsStatus === 'denied' && (
            <View style={styles.gpsStatusRow}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <Text style={[styles.gpsStatusText, { color: '#F59E0B' }]}>Location access denied — type your address manually</Text>
            </View>
          )}
          {gpsStatus === 'error' && (
            <View style={styles.gpsStatusRow}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={[styles.gpsStatusText, { color: '#EF4444' }]}>Could not get GPS — enter your location manually</Text>
            </View>
          )}
          {/* SOS MODE: Show auto-detection confirmation */}
          {gpsStatus === 'success' && isSOS && (
            <View style={styles.gpsStatusRow}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={[styles.gpsStatusText, { color: '#059669' }]}>📍 Location detected automatically</Text>
            </View>
          )}

          {/* PHOTO — visible in all modes (evidence is critical in emergencies) */}
          <Text style={[styles.label, { marginTop: 15 }]}>Evidence (Optional)</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageScrollContainer}
          >
            {images.map((imgUri, idx) => (
              <View key={idx} style={styles.previewWrapper}>
                <Image source={{ uri: imgUri }} style={styles.preview} />
                <TouchableOpacity
                  style={styles.deletePhotoBtn}
                  onPress={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 4 && (
              <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="images" size={28} color="#64748B" />
                  <Text style={styles.photoText}>Add Photo</Text>
                  <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    {images.length}/4
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* DESCRIPTION */}
          <Text style={styles.label}>Description <Text style={{ color: 'red' }}>*</Text></Text>
          <TextInput
            style={[styles.input, styles.textArea, { marginBottom: 6 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what happened..."
            multiline
            autoFocus={isSOS}
            maxLength={1000}
          />
          <Text style={styles.charCount}>
            {description.length} / 1000 {description.length > 0 && description.length < 5 && <Text style={{ color: '#EF4444' }}>(Min 5 required)</Text>}
          </Text>

          {/* ANONYMOUS — hidden in express mode (auto-enabled) */}
          {!isExpressMode && (
            <>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Report Anonymously</Text>
                  <Text style={styles.switchSub}>
                    Hide name from public records
                  </Text>
                </View>
                <Switch
                  value={anonymous}
                  onValueChange={setAnonymous}
                  trackColor={{ true: Colors.primary }}
                />
              </View>

              {!anonymous && (
                <View>
                  <Text style={styles.label}>Your Name</Text>
                  <TextInput
                    style={styles.input}
                    value={reporterName}
                    onChangeText={setReporterName}
                    placeholder="Full Name"
                  />
                  <Text style={styles.label}>Contact #</Text>
                  <TextInput
                    style={styles.input}
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    keyboardType="phone-pad"
                    placeholder="0912..."
                  />
                </View>
              )}
            </>
          )}

        </ScrollView>

        <View style={styles.footer}>
          {/* EXPRESS MODE (SOS): Barangay indicator */}
          {isExpressMode && barangay ? (
            <View style={{ marginBottom: 8, alignSelf: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>
                📍 Sending to: <Text style={{ color: Colors.primary, fontWeight: '700' }}>{barangay}</Text>
              </Text>
            </View>
          ) : null}

          {/* SUBMIT */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              isSOS && styles.sosSubmitBtn,
              isSubmitting && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {isSOS ? "🚨 SEND EMERGENCY REPORT" : "SUBMIT REPORT"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* MODALS */}
      <ModalPicker
        visible={typePickerVisible}
        title="Incident Type"
        options={INCIDENT_TYPES}
        onSelect={handleSelectType}
        onClose={() => setTypePickerVisible(false)}
      />
      <ModalPicker
        visible={brgyPickerVisible}
        title="Select Barangay"
        options={dynamicBarangays}
        onSelect={handleSelectBarangay}
        onClose={() => setBrgyPickerVisible(false)}
        hasSearch
      />
      <LocationPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        initialLatitude={latitude || mapCenter.lat}
        initialLongitude={longitude || mapCenter.lng}
        onConfirm={(d) => {
          // FIX GPS RACE: Set isManual=true synchronously before any state updates.
          // This prevents a slow GPS resolve (still in-flight from fetchCurrentLocation)
          // from overwriting the manually-pinned barangay after onConfirm returns.
          setIsManual(true);
          setLatitude(d.latitude);
          setLongitude(d.longitude);

          // BARANGAY: Pure distance — which barangay is the pin closest to?
          const nearest = findNearestBarangay(d.latitude, d.longitude, barangayCoordsMap);
          // nearest may be "" if the pin is >25km from all known barangays
          setBarangay(nearest);
          setIsAutoDetected(!!nearest);

          // STREET/LANDMARK: Use the street/name from the modal's geocode result.
          // d.street comes from LocationPickerModal's rawGeoFields.street
          // which is addr.street || addr.name from the pin location.
          // If empty, leave blank — user can type it themselves.
          setLocation(d.street || "");
        }}
      />

      {/* UPLOAD PROGRESS OVERLAY */}
      {uploadPhase !== 'idle' && (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.uploadPhaseText}>
              {uploadPhase === 'uploading' && "Uploading evidence…"}
              {uploadPhase === 'saving' && "Saving report…"}
            </Text>
            <Text style={styles.uploadSubText}>Please don&apos;t close the app</Text>
          </View>
        </View>
      )}

      {/* SOS MODE: Full-screen success confirmation */}
      {showSuccessModal && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={56} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Emergency report sent</Text>
            <Text style={styles.successSubtitle}>
              Stay safe. Help is being notified.
            </Text>
            <Text style={styles.successCountdown}>
              Returning to Home in {countdown}s
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace("/(tabs)");
              }}
            >
              <Text style={styles.successButtonText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  barangayLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  autoDetectBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  autoDetectText: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "600",
  },
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  content: { padding: 20 },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: "#F8FAFC",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
    color: "#0F172A",
  },
  inputBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inputText: { fontSize: 15, color: "#0F172A" },
  row: { flexDirection: "row", alignItems: "center" },
  iconBtn: {
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginLeft: 8,
  },
  miniIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  photoBtn: { marginBottom: 20 },
  photoPlaceholder: {
    minHeight: 100,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#93C5FD",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  photoText: {
    color: "#2563EB",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  preview: { width: "100%", height: 200, borderRadius: 12 },
  textArea: { height: 100, textAlignVertical: "top" },
  imageScrollContainer: {
    paddingVertical: 10,
    gap: 12,
  },
  previewWrapper: {
    position: 'relative',
    height: 120,
    width: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginRight: 12,
  },
  deletePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    zIndex: 2,
  },
  charCount: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "right",
    marginBottom: 20,
    marginTop: -2,
    paddingRight: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  switchTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  switchSub: { fontSize: 12, color: "#64748B" },
  submitBtn: {
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  sosSubmitBtn: {
    backgroundColor: "#DC2626",
  },
  sosBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sosBannerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  sosBannerTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#DC2626",
  },
  sosBannerText: {
    fontSize: 12,
    color: "#991B1B",
    marginTop: 2,
  },
  showAllFieldsLink: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600" as const,
    marginTop: 10,
    textAlign: "center" as const,
  },
  gpsStatusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 6,
    marginBottom: 10,
    gap: 6,
  },
  gpsStatusText: {
    fontSize: 12,
    color: "#64748B",
  },
  helperText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: -8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  inputWarning: {
    borderColor: "#F59E0B",
    borderWidth: 1.5,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 100,
  },
  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center" as const,
    width: "80%" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  uploadPhaseText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#0F172A",
    marginTop: 16,
  },
  uploadSubText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
  },
  // SOS MODE: Priority badge
  priorityBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#DC2626",
  },
  // SOS MODE: Success confirmation styles
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 200,
  },
  successCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 40,
    alignItems: "center" as const,
    width: "85%" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 15,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#059669",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center" as const,
  },
  successSubtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 20,
  },
  successCountdown: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%" as const,
    alignItems: "center" as const,
  },
  successButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
});