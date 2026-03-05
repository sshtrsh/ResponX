import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";

type LocationData = {
  latitude: number;
  longitude: number;
  address: string;
  // Raw fields from the pin's reverse geocode result
  // These tell report.tsx which barangay was pinned
  district: string;   // Most reliable for PH barangay level
  subregion: string;  // Fallback on some Android devices
  street: string;
  city: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: LocationData) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
};

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Fix 3: Default coords as constants (not inline ||)
const DEFAULT_LAT = 14.1953; // La Mesa
const DEFAULT_LNG = 121.1449;

export default function LocationPickerModal({
  visible,
  onClose,
  onConfirm,
  initialLatitude,
  initialLongitude,
}: Props) {
  const mapRef = useRef<MapView>(null);
  // Fix 1: Safe area insets for header positioning
  const insets = useSafeAreaInsets();
  // Fix 2: Debounce timer ref for cleanup
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fix 3: Use ?? instead of || so coordinate 0 is valid (not falsy)
  const [region, setRegion] = useState<Region>({
    latitude: initialLatitude ?? DEFAULT_LAT,
    longitude: initialLongitude ?? DEFAULT_LNG,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  const [address, setAddress] = useState("");
  const [rawGeoFields, setRawGeoFields] = useState({
    district: "",
    subregion: "",
    street: "",
    city: "",
  });
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchNoResult, setSearchNoResult] = useState(false);



  // Fix 8: Reset ALL state on modal close (not just searchText)
  useEffect(() => {
    if (!visible) {
      setSearchText("");
      setAddress("");
      setRawGeoFields({ district: "", subregion: "", street: "", city: "" });
      setSearchNoResult(false);
    }
    // Fix 2: Clean up debounce timer on close/unmount
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [visible]);

  // 2. REVERSE GEOCODING
  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });
      if (addresses.length > 0) {
        const addr = addresses[0];
        setRawGeoFields({
          district: addr.district || "",
          subregion: addr.subregion || "",
          street: addr.street || addr.name || "",
          city: addr.city || "",
        });
        const parts = [
          addr.street,
          addr.name !== addr.street ? addr.name : null,
          addr.city,
          addr.region,
        ].filter(Boolean);
        setAddress(parts.join(", "));
      } else {
        setRawGeoFields({ district: "", subregion: "", street: "", city: "" });
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setRawGeoFields({ district: "", subregion: "", street: "", city: "" });
      setAddress("Unknown Location");
    } finally {
      setLoadingAddress(false);
    }
  }, []);

  // 3. SEARCH FUNCTION
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    Keyboard.dismiss();
    setIsSearching(true);
    setSearchNoResult(false);
    try {
      const result = await Location.geocodeAsync(searchText);
      if (result.length > 0) {
        const { latitude, longitude } = result[0];
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };
        // Fix 9: Update region state so Confirm sends correct coords
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 1000);
        setSearchText(""); // Clear text to signal success
      } else {
        setSearchNoResult(true);
      }
    } catch {
      // Ignored
    } finally {
      setIsSearching(false);
    }
  };

  // 4. MAP MOVEMENT HANDLER — Fix 2: Debounced reverse geocode (400ms)
  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    // Cancel any pending geocode call
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAddress(newRegion.latitude, newRegion.longitude);
    }, 400);
  };

  // Instant locate — Fix 7: Sets region state before animating
  const autoLocateUser = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const { latitude, longitude } = lastKnown.coords;
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        };
        // Fix 7: Update region state FIRST so Confirm sends correct coords
        setRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 300);
        return;
      }

      const fresh = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const freshRegion = {
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setRegion(freshRegion);
      mapRef.current?.animateToRegion(freshRegion, 500);
    } catch {
      // Ignored
    }
    // FIX: fetchAddress is NOT called inside this function — removed from dep array.
    // The only dep is setRegion/mapRef (both stable refs), so [] is correct.
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (initialLatitude != null && initialLongitude != null) {
      const newRegion = {
        latitude: initialLatitude,
        longitude: initialLongitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
      fetchAddress(initialLatitude, initialLongitude);
    } else {
      autoLocateUser();
    }
  }, [visible, initialLatitude, initialLongitude, autoLocateUser, fetchAddress]);


  const handleLocateMe = async () => {
    await autoLocateUser();
  };

  const handleConfirm = () => {
    onConfirm({
      latitude: region.latitude,
      longitude: region.longitude,
      address: address || "Pinned Location",
      district: rawGeoFields.district,
      subregion: rawGeoFields.subregion,
      street: rawGeoFields.street,
      city: rawGeoFields.city,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* --- MAP --- */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation={true}
          showsMyLocationButton={false}
          rotateEnabled={false}
        />

        {/* --- CENTER FIXED PIN (The "Uber" Pin) --- */}
        <View style={styles.centerMarkerContainer} pointerEvents="none">
          <Ionicons
            name="location"
            size={48}
            color={Colors.primary}
            style={styles.pinShadow}
          />
        </View>

        {/* --- TOP HEADER — Fix 1: useSafeAreaInsets instead of hardcoded top --- */}
        <View
          style={[styles.headerOverlay, { top: insets.top + 10 }]}
          pointerEvents="box-none"
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </TouchableOpacity>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search barangay, landmark..."
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  setSearchNoResult(false);
                }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <ActivityIndicator size="small" color="#666" />
                ) : (
                  <Ionicons name="search" size={20} color="#666" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Search no results feedback */}
          {searchNoResult && (
            <View style={styles.searchNoResult}>
              <Ionicons name="alert-circle-outline" size={16} color="#92400E" />
              <Text style={styles.searchNoResultText}>
                No results for &quot;{searchText}&quot;
              </Text>
            </View>
          )}
        </View>

        {/* --- LOCATE ME BUTTON --- */}
        <TouchableOpacity
          style={[styles.locateBtn, { bottom: Math.max(insets.bottom, 24) + 160 }]}
          onPress={handleLocateMe}
        >
          <Ionicons name="locate" size={24} color="#1e293b" />
        </TouchableOpacity>

        {/* --- BOTTOM CARD --- */}
        <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
          <View style={styles.dragIndicator} />

          <View style={styles.addressContainer}>
            <View style={styles.addressIconBox}>
              <Ionicons
                name="location-sharp"
                size={24}
                color={Colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>Pinned Location</Text>
              {loadingAddress ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.primary}
                  style={{ alignSelf: "flex-start" }}
                />
              ) : (
                <View>
                  <Text style={[styles.addressText, { fontSize: 16 }]} numberOfLines={1}>
                    {rawGeoFields.district || rawGeoFields.subregion || (address === "Unknown Location" ? "Unknown Area" : address) || "Dragging map..."}
                  </Text>
                  {!!(rawGeoFields.street || rawGeoFields.city) && (
                    <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2, fontWeight: "500" }} numberOfLines={1}>
                      {[rawGeoFields.street, rawGeoFields.city].filter(Boolean).join(", ")}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, loadingAddress && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={loadingAddress}
          >
            <Text style={styles.confirmText}>Confirm Location</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { width: "100%", height: "100%" },

  // CENTER PIN STYLES
  centerMarkerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
    transform: [{ translateY: -24 }], // Replaces paddingBottom math hack for exact tip alignment
  },
  pinShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  // Fix 1: No hardcoded top — uses insets in JSX
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    marginRight: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 15,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: { flex: 1, marginRight: 10, fontSize: 16, color: "#1e293b" },
  searchNoResult: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  searchNoResultText: { fontSize: 13, color: "#92400E", fontWeight: "500" },

  locateBtn: {
    position: "absolute",
    right: 20,
    bottom: 240,
    width: 50,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 9,
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 16,
  },
  addressIconBox: {
    width: 40,
    height: 40,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  addressLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  addressText: { fontSize: 15, color: "#1E293B", fontWeight: "600" },
  confirmBtn: {
    backgroundColor: "#0F172A",
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  confirmText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});