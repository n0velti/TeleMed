import { Stack } from 'expo-router';

export default function SpecialistsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="[category]" 
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

