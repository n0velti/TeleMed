import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

interface SpecialistCardProps {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  price: number;
  image?: string;
  nextAvailableTime?: string;
  onPress?: () => void;
}

export function SpecialistCard({ 
  id, 
  name, 
  specialty, 
  rating, 
  experience,
  price, 
  image,
  nextAvailableTime,
  onPress 
}: SpecialistCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Generate a gradient background color based on doctor's ID for variety
  const getGradientColors = (id: string): readonly [string, string] => {
    const gradients: readonly [string, string][] = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#30cfd0', '#330867'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
    ];
    const index = parseInt(id) % gradients.length;
    return gradients[index];
  };

  const gradientColors = getGradientColors(id);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      {image ? (
        <ImageBackground 
          source={{ uri: image }} 
          style={styles.imageBackground}
          imageStyle={styles.imageStyle}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
            style={styles.overlay}
          >
            <View style={styles.content}>
              <View style={styles.bottomInfo}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {name}
                </ThemedText>
                {nextAvailableTime && (
                  <ThemedText style={styles.availableTime}>
                    🕐 {nextAvailableTime}
                  </ThemedText>
                )}
                <View style={styles.infoRow}>
                  <ThemedText style={styles.rating}>⭐ {rating}</ThemedText>
                  <ThemedText style={styles.price}>${price}</ThemedText>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBackground}
        >
          <View style={styles.content}>
            <View style={styles.bottomInfo}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {name}
              </ThemedText>
              {nextAvailableTime && (
                <ThemedText style={styles.availableTime}>
                  🕐 {nextAvailableTime}
                </ThemedText>
              )}
              <View style={styles.infoRow}>
                <ThemedText style={styles.rating}>⭐ {rating}</ThemedText>
                <ThemedText style={styles.price}>${price}</ThemedText>
              </View>
            </View>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    height: 200,
    marginRight: 12,
    overflow: 'hidden',
  },
  imageBackground: {
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  bottomInfo: {
    gap: 6,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  availableTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

