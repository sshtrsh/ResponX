import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import { format } from "date-fns";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
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

interface Update {
    id: string;
    update_type: string;
    message: string | null;
    image_url: string | null;
    created_at: string;
}

export default function FollowUpScreen() {
    const router = useRouter();
    const { session } = useAuth();
    const { id, incident_type } = useLocalSearchParams<{
        id: string;
        incident_type: string;
    }>();

    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);



    const fetchUpdates = useCallback(async () => {
        if (!id) return;
        const { data } = await supabase
            .from("report_updates")
            .select("id, update_type, message, image_url, created_at")
            .eq("report_id", id)
            .order("created_at", { ascending: false });
        setUpdates(data || []);
        setLoading(false);
    }, [id]);

    useEffect(() => {
        fetchUpdates();
    }, [id, fetchUpdates]);


    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
        });
        if (!res.canceled) setImageUri(res.assets[0].uri);
    };

    const uploadImage = async (uri: string) => {
        try {
            const ext = uri.split(".").pop();
            const fileName = `${session!.user.id}/followup_${Date.now()}.${ext}`;
            const base64 = await (FileSystem as any).readAsStringAsync(uri, {
                encoding: "base64",
            });
            const { error } = await supabase.storage
                .from("evidence")
                .upload(fileName, decode(base64), {
                    contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
                    upsert: false,
                });
            if (error) throw error;
            const {
                data: { publicUrl },
            } = supabase.storage.from("evidence").getPublicUrl(fileName);
            return publicUrl;
        } catch {
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!message.trim() && !imageUri) {
            return Alert.alert("Empty", "Please add a message or photo.");
        }

        setIsSubmitting(true);
        try {
            let uploadedUrl: string | null = null;
            if (imageUri) {
                uploadedUrl = await uploadImage(imageUri);
                if (!uploadedUrl) {
                    Alert.alert("Upload Failed", "Could not upload image.");
                    setIsSubmitting(false);
                    return;
                }
            }

            const { error } = await supabase.from("report_updates").insert({
                report_id: id,
                user_id: session!.user.id,
                update_type: "follow_up",
                message: message.trim() || null,
                image_url: uploadedUrl,
            });

            if (error) throw error;

            setMessage("");
            setImageUri(null);
            fetchUpdates();
            Alert.alert("Sent", "Your follow-up has been added.");
        } catch (e: any) {
            Alert.alert("Error", e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderUpdate = ({ item }: { item: Update }) => (
        <View style={styles.updateCard}>
            <View style={styles.updateHeader}>
                <View style={styles.typeBadge}>
                    <Ionicons
                        name={item.update_type === "edit" ? "create" : "chatbubble"}
                        size={12}
                        color={Colors.primary}
                    />
                    <Text style={styles.typeBadgeText}>
                        {item.update_type === "edit" ? "Edit" : "Follow-Up"}
                    </Text>
                </View>
                <Text style={styles.timeText}>
                    {format(new Date(item.created_at), "MMM d, h:mm a")}
                </Text>
            </View>
            {item.message && <Text style={styles.messageText}>{item.message}</Text>}
            {item.image_url && (
                <Image source={{ uri: item.image_url }} style={styles.updateImage} />
            )}
        </View>
    );

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
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.headerTitle}>Follow-Up</Text>
                        <Text style={styles.headerSub}>
                            {incident_type || "Report"} • Case #{(id || "").substring(0, 8)}
                        </Text>
                    </View>
                </View>

                {/* Updates Timeline */}
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={updates}
                        keyExtractor={(item) => item.id}
                        renderItem={renderUpdate}
                        contentContainerStyle={styles.listContent}
                        ListHeaderComponent={
                            /* Compose Area */
                            <View style={styles.composeCard}>
                                <Text style={styles.composeTitle}>Add Follow-Up</Text>
                                <TextInput
                                    style={styles.composeInput}
                                    value={message}
                                    onChangeText={setMessage}
                                    placeholder="Add details, corrections, or updates..."
                                    multiline
                                />
                                <View style={styles.composeFooter}>
                                    <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                                        <Ionicons
                                            name={imageUri ? "checkmark-circle" : "camera"}
                                            size={20}
                                            color={imageUri ? Colors.success : "#64748B"}
                                        />
                                        <Text
                                            style={[
                                                styles.attachText,
                                                imageUri && { color: Colors.success },
                                            ]}
                                        >
                                            {imageUri ? "Photo attached" : "Attach Photo"}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sendBtn, isSubmitting && { opacity: 0.6 }]}
                                        onPress={handleSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <Ionicons name="send" size={16} color="#fff" />
                                                <Text style={styles.sendText}>Send</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons
                                    name="chatbubbles-outline"
                                    size={48}
                                    color="#CBD5E1"
                                />
                                <Text style={styles.emptyText}>No updates yet</Text>
                                <Text style={styles.emptySub}>
                                    Use the form above to add more info.
                                </Text>
                            </View>
                        }
                    />
                )}
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
        padding: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderColor: "#E2E8F0",
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
    headerSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
    listContent: { padding: 20 },
    composeCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    composeTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 10,
    },
    composeInput: {
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        height: 80,
        textAlignVertical: "top",
        color: "#0F172A",
    },
    composeFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    attachBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    attachText: { fontSize: 13, color: "#64748B", fontWeight: "500" },
    sendBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    sendText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    updateCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    updateHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    typeBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: Colors.primary,
    },
    timeText: { fontSize: 11, color: "#94A3B8" },
    messageText: { fontSize: 14, color: "#0F172A", lineHeight: 20 },
    updateImage: {
        width: "100%",
        height: 160,
        borderRadius: 8,
        marginTop: 8,
    },
    emptyContainer: { alignItems: "center", paddingTop: 40 },
    emptyText: { fontSize: 16, fontWeight: "700", color: "#94A3B8", marginTop: 12 },
    emptySub: { fontSize: 13, color: "#94A3B8", marginTop: 4 },
});
