import { Stack } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../contexts/AuthProvider";

function RootLayoutNav() {
  const { loading } = useAuth();

  // PREVENT SCREEN FLASH ON STARTUP
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />

      {/* EXPLICITLY REGISTER SCREENS FOR BETTER HEADER CONTROL */}
      <Stack.Screen name="blotter-guide" options={{ headerShown: false }} />
      <Stack.Screen name="my-reports" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
