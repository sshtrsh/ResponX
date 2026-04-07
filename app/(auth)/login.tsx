import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { categorizeError } from "../../lib/errorHandler";
import { supabase } from "../../lib/supabase";
import { validateLogin } from "../../lib/validation";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    // 1. Validate inputs with Zod
    const validation = validateLogin({ email, password });
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      Alert.alert("Validation Error", firstError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        // 2. Categorize Supabase auth errors for user-friendly messages
        const appError = categorizeError(error);
        Alert.alert("Login Failed", appError.message);
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: unknown) {
      const appError = categorizeError(error);
      Alert.alert(appError.category, appError.message);
    } finally {
      setLoading(false);
    }
  }

  const handleGuestMode = () => {
    router.replace("/(tabs)");
  };

  const handleForgotPassword = () => {
    Alert.alert("Coming Soon", "Password reset functionality is coming soon.");
  };

  return (
    <View style={styles.container}>
      {/* FIXED STATUS BAR COLOR */}
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <View style={styles.header}>
        <Image source={require("../../assets/images/icon.png")} style={styles.headerLogo} />
        <Text style={styles.appName}>ResponX</Text>
        <Text style={styles.tagline}>Safe Community, Faster Response.</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.welcomeText}>Welcome Back</Text>
        <Text style={styles.instructionText}>
          Sign in to access resident services
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#64748B"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address" // ADDED KEYBOARD TYPE
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#64748B"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#64748B"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        {/* ... Rest of UI (Divider, Guest, etc.) same as original ... */}
        <View style={styles.dividerBox}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.guestButton} onPress={handleGuestMode}>
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
          <Ionicons name="arrow-forward" size={16} color="#475569" />
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New here? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.registerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E40AF" },
  header: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 30,
  },
  headerLogo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 15,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    letterSpacing: 1,
  },
  tagline: { color: "#BFDBFE", fontSize: 14, marginTop: 5 },
  formContainer: {
    flex: 2,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 5,
  },
  instructionText: { fontSize: 14, color: "#64748B", marginBottom: 25 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 56,
    marginBottom: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: "#1E293B", fontSize: 16 },
  forgotPassword: {
    textAlign: "right",
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 25,
  },
  loginButton: {
    backgroundColor: "#2563EB",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  loginButtonText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
  dividerBox: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: {
    marginHorizontal: 15,
    color: "#94A3B8",
    fontWeight: "600",
    fontSize: 12,
  },
  guestButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    height: 56,
    borderRadius: 12,
  },
  guestButtonText: { color: "#475569", fontWeight: "bold", marginRight: 8 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: "auto" },
  footerText: { color: "#64748B" },
  registerLink: { color: "#2563EB", fontWeight: "bold" },
});
