import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';

export default function MedicalRecordsScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(tabs)/account');
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.message}>Loading medical records...</ThemedText>
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Medical Records</ThemedText>
      <ThemedText style={styles.subtitle}>
        You will be able to review your medical history and documents here.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: '50%',
  },
});

