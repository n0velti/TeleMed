import { Stack } from 'expo-router';

/**
 * Layout for video call routes
 * Configured to support full-screen video call experience
 */
export default function VideoCallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide header for video calls
        presentation: 'fullScreenModal', // Full screen experience
      }}
    >
      <Stack.Screen
        name="[appointmentId]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

