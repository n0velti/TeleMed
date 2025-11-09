import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

// Social Proof Indicator Types
export type SocialProofType = 
  | 'review_count'      // "342 reviews"
  | 'patient_count'     // "2.3k patients"
  | 'return_rate'       // "95% return"
  | 'response_time'     // "2h response"
  | 'verified';          // "✓ Verified"

// Popularity Badge Types
export type PopularityBadgeType = 
  | 'popular'           // "🔥 Popular"
  | 'most_booked'       // "📅 Most Booked"
  | 'top_rated'         // "⭐ Top Rated"
  | 'new'               // "✨ New"
  | 'featured';         // "⭐ Featured"

interface SpecialistCardProps {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  price: number;
  image?: string;
  nextAvailableTime?: string;
  socialProof?: {
    type: SocialProofType;
    value?: string | number; // For review_count, patient_count, return_rate, response_time
  };
  popularityBadge?: PopularityBadgeType;
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
  socialProof,
  popularityBadge,
  onPress 
}: SpecialistCardProps) {
  const colorScheme = useColorScheme();

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

  // Get social proof indicator text
  const getSocialProofText = (): string => {
    if (!socialProof) return '';
    
    switch (socialProof.type) {
      case 'review_count':
        const reviews = socialProof.value || 0;
        return `${reviews} reviews`;
      case 'patient_count':
        const patients = socialProof.value || 0;
        if (typeof patients === 'number') {
          if (patients >= 1000) {
            return `${(patients / 1000).toFixed(1)}k patients`;
          }
          return `${patients} patients`;
        }
        return `${patients} patients`;
      case 'return_rate':
        const rate = socialProof.value || 0;
        return `${rate}% return`;
      case 'response_time':
        const time = socialProof.value || '2h';
        return `${time} response`;
      case 'verified':
        return '✓ Verified';
      default:
        return '';
    }
  };

  // Get popularity badge text
  const getPopularityBadgeText = (): string => {
    switch (popularityBadge) {
      case 'popular':
        return '🔥 Popular';
      case 'most_booked':
        return '📅 Most Booked';
      case 'top_rated':
        return '⭐ Top Rated';
      case 'new':
        return '✨ New';
      case 'featured':
        return '⭐ Featured';
      default:
        return '';
    }
  };

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
            {popularityBadge && (
              <ThemedText style={styles.popularityBadgeTopRight}>
                {getPopularityBadgeText()}
              </ThemedText>
            )}
            <View style={styles.content}>
              <View style={styles.bottomRow}>
                <ThemedText style={styles.name} numberOfLines={1}>
                  {name}
                </ThemedText>
                <ThemedText style={styles.price}>${price}</ThemedText>
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
          {popularityBadge && (
            <ThemedText style={styles.popularityBadgeTopRight}>
              {getPopularityBadgeText()}
            </ThemedText>
          )}
          <View style={styles.content}>
            <View style={styles.bottomRow}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {name}
              </ThemedText>
              <ThemedText style={styles.price}>${price}</ThemedText>
            </View>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 245,
    height: 135,
    marginRight: 6,
    overflow: 'hidden',
    borderRadius: 3,

  },
  imageBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  imageStyle: {
    resizeMode: 'cover',
    borderRadius: 3,
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    position: 'relative',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  content: {
    flex: 1,
    padding: 10,
    justifyContent: 'flex-end',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    flex: 1,
    marginRight: 8,
  },
  popularityBadgeTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    zIndex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

