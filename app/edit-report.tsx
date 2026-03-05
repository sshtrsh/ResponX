import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { useAuth } from "../contexts/AuthProvider";
import { supabase } from "../lib/supabase";

export default function EditReportScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [report, setReport] = useState<any>(null);

    // Editable fields
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [newImageUri, setNewImageUri] = useState<string | null>(null);



    const fetchReport = useCallback(async () => {
        if (!id) return;
        const { data, error } = await supabase
            .from("reports")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            Alert.alert("Error", "Report not found.");
            router.back();
            return;
        }

        if (data.status !== "Pending") {
            Alert.alert("Cannot Edit", "Only pending reports can be edited.");
            router.back();
            return;
        }

        if (data.user_id !== session?.user?.id) {
            Alert.alert("Unauthorized", "You can only edit your own reports.");
            router.back();
            return;
        }

        setReport(data);
        setDescription(data.description || "");
        setLocation(data.location || "");
        setImage(data.image_url || null);
        setLoading(false);
    }, [id, session?.user?.id, router]);

    useEffect(() => {
        fetchReport();
    }, [id, fetchReport]);


    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
        });
        if (!res.canceled) {
            setNewImageUri(res.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string): Promise<string | null> => {
        try {
            const ext = uri.split(".").pop();
            const fileName = `${session!.user.id}/${Date.now()}.${ext}`;
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: "base64",
            });
            const { error } = await supabase.storage
                .from("evidence")
                .upload(fileName, decode(base64), {
                    contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
                    upsert: false,
                });
            if (error) throw error;
            // Return the storage path, NOT a public URL.
            // The admin dashboard uses evidenceUrl.ts to generate signed URLs at view-time.
            return fileName;
        } catch {
            return null;
        }
    };

    const handleSave = async () => {
        if (!report) return;
        if (description.length < 5) {
            return Alert.alert("Too Short", "Description must be at least 5 characters.");
        }

        setIsSubmitting(true);

        try {
            // Store old values for audit trail
            const previousValues: Record<string, unknown> = {};
            if (description !== report.description) previousValues.description = report.description;
            if (location !== report.location) previousValues.location = report.location;

            // Upload new image if provided
            let finalImageUrl = report.image_url;
            if (newImageUri) {
                const uploaded = await uploadImage(newImageUri);
                if (!uploaded) {
                    Alert.alert("Upload Failed", "Could not upload new image.");
                    setIsSubmitting(false);
                    return;
                }
                previousValues.image_url = report.image_url;
                finalImageUrl = uploaded;
            }

            // Only proceed if something changed
            if (Object.keys(previousValues).length === 0) {
                Alert.alert("No Changes", "Nothing was modified.");
                setIsSubmitting(false);
                return;
            }

            // Update the report
            const { error: updateError } = await supabase
                .from("reports")
                .update({
                    description,
                    location,
                    image_url: finalImageUrl,
                })
                .eq("id", report.id)
                .eq("status", "Pending"); // safety guard

            if (updateError) throw updateError;

            // Insert audit trail
            await supabase.from("report_updates").insert({
                report_id: report.id,
                user_id: session!.user.id,
                update_type: "edit",
                message: `Edited: ${Object.keys(previousValues).join(", ")}`,
                previous_values: previousValues,
            });

            Alert.alert("Updated", "Your report has been updated.", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Edit Report</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* Status badge */}
                    <View style={styles.statusBar}>
                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                        <Text style={styles.statusText}>
                            Editing — changes are saved to audit trail
                        </Text>
                    </View>

                    {/* Incident type (read-only) */}
                    <Text style={styles.label}>Incident Type</Text>
                    <View style={styles.readOnly}>
                        <Text style={styles.readOnlyText}>{report.incident_type}</Text>
                        <Ionicons name="lock-closed" size={14} color="#94A3B8" />
                    </View>

                    {/* Location */}
                    <Text style={styles.label}>Location</Text>
                    <TextInput
                        style={styles.input}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="Street / Landmark"
                    />

                    {/* Description */}
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Describe what happened..."
                        multiline
                    />

                    {/* Photo */}
                    <Text style={styles.label}>Evidence</Text>
                    <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                        {newImageUri ? (
                            <Image source={{ uri: newImageUri }} style={styles.preview} />
                        ) : image ? (
                            <Image source={{ uri: image }} style={styles.preview} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <Ionicons name="camera" size={24} color="#64748B" />
                                <Text style={styles.photoText}>Replace Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitText}>SAVE CHANGES</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    statusBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#EFF6FF",
        padding: 12,
        borderRadius: 10,
        marginBottom: 20,
    },
    statusText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
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
    readOnly: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    readOnlyText: { fontSize: 15, color: "#64748B", fontWeight: "500" },
    textArea: { height: 100, textAlignVertical: "top" },
    photoBtn: { marginBottom: 20 },
    photoPlaceholder: {
        height: 120,
        backgroundColor: "#F1F5F9",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderStyle: "dashed",
        alignItems: "center",
        justifyContent: "center",
    },
    photoText: { color: "#64748B", marginTop: 8, fontSize: 12, fontWeight: "500" },
    preview: { width: "100%", height: 200, borderRadius: 8 },
    submitBtn: {
        backgroundColor: "#0F172A",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
