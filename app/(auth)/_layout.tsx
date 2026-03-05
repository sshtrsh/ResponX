import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#F8FAFC', // Matches the Login background
          },
          headerShadowVisible: false, // Removes the ugly line under the header
          headerTitle: '', // Keep it clean, or set to 'Account'
          headerTintColor: '#0F172A', // Color of the back button
        }}
      >
        <Stack.Screen 
          name="login" 
          options={{ 
            headerShown: false // Usually, you hide the header on the main login
          }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ 
            headerTitle: 'Create Account',
            headerShown: true // Shows the back button so they can return to Login
          }} 
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});