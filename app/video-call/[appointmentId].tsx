import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VideoCall } from '@/components/video-call';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Video Call Screen
 * 
 * This screen displays the video call interface for appointments
 * 
 * Route: /video-call/[appointmentId]
 * 
 * Security:
 * - Only authenticated users can access
 * - Appointment ID is validated
 * - Meeting credentials are fetched securely
 * 
 * Features:
 * - Real-time video and audio communication
 * - Mute/unmute controls
 * - Video on/off toggle
 * - Hang up functionality
 */
export default function VideoCallScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();

  const handleCallEnd = () => {
    // Navigate back to appointment detail or home
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  // Validate appointment ID
  if (!appointmentId) {
    return (
      <View style={styles.container}>
        <Stack.Screen 
          options={{ 
            headerShown: true,
            title: 'Video Call',
            headerBackTitle: 'Back',
          }} 
        />
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            Invalid appointment. Cannot start video call.
          </ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false, // Hide header for full-screen video experience
        }} 
      />
      <VideoCall 
        appointmentId={appointmentId}
        onCallEnd={handleCallEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ff4444',
  },
});

