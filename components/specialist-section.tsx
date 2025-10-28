import React, { useRef, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ScrollArrow } from './scroll-arrow';
import { SpecialistCard } from './specialist-card';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  price: number;
  image?: string;
}

interface SpecialistSectionProps {
  title: string;
  specialists: Specialist[];
  onSpecialistPress?: (specialist: Specialist) => void;
  onTitlePress?: (title: string) => void;
}

export function SpecialistSection({ title, specialists, onSpecialistPress, onTitlePress }: SpecialistSectionProps) {
  const flatListRef = useRef<FlatList>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollStep = 322; // Width of card (310) + margin (12)

  const scrollLeft = () => {
    if (flatListRef.current && scrollPosition > 0) {
      const newPosition = Math.max(0, scrollPosition - scrollStep);
      flatListRef.current.scrollToOffset({ offset: newPosition, animated: true });
      setScrollPosition(newPosition);
    }
  };

  const scrollRight = () => {
    if (flatListRef.current) {
      const newPosition = scrollPosition + scrollStep;
      flatListRef.current.scrollToOffset({ offset: newPosition, animated: true });
      setScrollPosition(newPosition);
    }
  };

  const handleScroll = (event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.x;
    setScrollPosition(currentOffset);
    setCanScrollLeft(currentOffset > 0);
    
    // Check if we can scroll right (approximate calculation)
    const contentWidth = event.nativeEvent.contentSize.width;
    const layoutWidth = event.nativeEvent.layoutMeasurement.width;
    setCanScrollRight(currentOffset < contentWidth - layoutWidth - 50);
  };

  const renderSpecialist = ({ item }: { item: Specialist }) => (
    <SpecialistCard
      {...item}
      onPress={() => onSpecialistPress?.(item)}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.titleContainer}
          onPress={() => onTitlePress?.(title)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.titleArrow}>→</ThemedText>
        </TouchableOpacity>
        <View style={styles.arrowContainer}>
          <ScrollArrow
            direction="left"
            onPress={scrollLeft}
            disabled={!canScrollLeft}
          />
          <ScrollArrow
            direction="right"
            onPress={scrollRight}
            disabled={!canScrollRight}
          />
        </View>
      </View>
      <FlatList
        ref={flatListRef}
        data={specialists}
        renderItem={renderSpecialist}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  arrowContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  separator: {
    width: 0,
  },
});
