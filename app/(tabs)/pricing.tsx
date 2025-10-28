import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function PricingScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Pricing</ThemedText>
      <ThemedText>View our pricing plans and subscription options.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
