import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";

// 1. IMPROVED TYPE DEFINITION (Supports Color)
export type PickerItem =
  | string
  | {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    color?: string;
  };

interface ModalPickerProps {
  visible: boolean;
  title: string;
  options: readonly PickerItem[];
  onSelect: (item: PickerItem) => void;
  onClose: () => void;
  hasSearch?: boolean;
}

export default function ModalPicker({
  visible,
  title,
  options,
  onSelect,
  onClose,
  hasSearch = false,
}: ModalPickerProps) {
  const [search, setSearch] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSearch("");
      setIsSelecting(false);
    }
  }, [visible]);

  const filteredOptions = options.filter((item) => {
    const text = typeof item === "string" ? item : item.label;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  const renderItem = ({ item }: { item: PickerItem }) => {
    const label = typeof item === "string" ? item : item.label;

    let icon = null;
    let color = Colors.primary;

    if (typeof item !== "string") {
      icon = item.icon;
      color = item.color || Colors.primary;
    }

    return (
      <Pressable
        style={({ pressed }) => [
          styles.option,
          pressed && Platform.OS === 'ios' && { opacity: 0.7 }
        ]}
        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        onPress={() => {
          if (isSelecting) return;
          setIsSelecting(true);
          onSelect(item);
          onClose();
        }}
      >
        <View style={styles.optionLeft}>
          {icon && (
            <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
          )}
          <Text style={styles.optionText}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#E2E8F0" />
      </Pressable>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      // Fix 3: Android hardware back button closes the modal
      onRequestClose={onClose}
    >
      {/* Fix 4: Tap outside (overlay) to dismiss */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Stop propagation so tapping inside doesn't close */}
          <TouchableWithoutFeedback>
            <View style={styles.container} onStartShouldSetResponder={() => true}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Search Bar — Fix 6: Clear button */}
              {hasSearch && (
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.input}
                    placeholder="Search..."
                    placeholderTextColor="#94A3B8"
                    value={search}
                    onChangeText={setSearch}
                  />
                  {/* Fix 6: Clear button when there's text */}
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* List */}
              <FlatList
                data={filteredOptions}
                keyExtractor={(item, index) =>
                  typeof item === "string" ? item : item.value + index
                }
                renderItem={renderItem}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                // Fix 2: Empty state for search and general empty list
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons
                      name={search.length > 0 ? "search-outline" : "folder-open-outline"}
                      size={40}
                      color="#CBD5E1"
                    />
                    <Text style={styles.emptyText}>
                      {search.length > 0 ? `No results for "${search}"` : "No options available."}
                    </Text>
                  </View>
                }
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Fix 8: maxHeight instead of fixed height — adapts to small screens
    maxHeight: "80%",
    padding: 24,
    paddingBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  closeBtn: {
    backgroundColor: "#F1F5F9",
    padding: 8,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  input: { marginLeft: 10, flex: 1, fontSize: 15, color: "#0F172A" },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionLeft: { flexDirection: "row", alignItems: "center" },
  optionText: { fontSize: 16, color: "#334155", fontWeight: "500" },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  // Fix 2: Empty search state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
