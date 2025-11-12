import Octicons from '@expo/vector-icons/Octicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PopularityBadgeType, SocialProofType, SpecialistCard } from './specialist-card';
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
  socialProof?: {
    type: SocialProofType;
    value?: string | number;
  };
  popularityBadge?: PopularityBadgeType;
}

interface SpecialistSectionProps {
  title: string;
  specialists: Specialist[];
  onSpecialistPress?: (specialist: Specialist) => void;
  onTitlePress?: (title: string) => void;
  isFirst?: boolean;
}

export function SpecialistSection({ title, specialists, onSpecialistPress, onTitlePress, isFirst }: SpecialistSectionProps) {
  const flatListRef = useRef<FlatList>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [leftArrowPressed, setLeftArrowPressed] = useState(false);
  const [rightArrowPressed, setRightArrowPressed] = useState(false);

  const cardWidth = 245;
  const cardMargin = 6;
  const scrollStep = cardWidth + cardMargin;

  const updateScrollState = (offset: number, contentW: number, layoutW: number) => {
    setCanScrollLeft(offset > 5);
    setCanScrollRight(contentW > layoutW && offset < contentW - layoutW - 5);
  };

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
    
    const contentW = event.nativeEvent.contentSize.width;
    const layoutW = event.nativeEvent.layoutMeasurement.width;
    setContentWidth(contentW);
    setLayoutWidth(layoutW);
    updateScrollState(currentOffset, contentW, layoutW);
  };

  const handleContentSizeChange = (w: number) => {
    setContentWidth(w);
    if (layoutWidth > 0) {
      updateScrollState(scrollPosition, w, layoutWidth);
    }
  };

  const handleLayout = (e: any) => {
    const w = e.nativeEvent.layout.width;
    setLayoutWidth(w);
    if (contentWidth > 0) {
      updateScrollState(scrollPosition, contentWidth, w);
    }
  };

  useEffect(() => {
    // Update scroll state when content or layout dimensions change
    if (contentWidth > 0 && layoutWidth > 0) {
      updateScrollState(scrollPosition, contentWidth, layoutWidth);
    }
  }, [contentWidth, layoutWidth, specialists.length]);

  const renderSpecialist = ({ item }: { item: Specialist }) => (
    <SpecialistCard
      {...item}
      onPress={() => onSpecialistPress?.(item)}
    />
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, isFirst && styles.firstHeader]}>
        <TouchableOpacity 
          style={styles.titleContainer}
          onPress={() => onTitlePress?.(title)}
          activeOpacity={0.7}
        >
          <ThemedText style={styles.title}>{title}</ThemedText>
          <Octicons name="chevron-right" size={17} color="black" style={styles.titleArrow} />
        </TouchableOpacity>
      </View>
      <View style={styles.carouselContainer}>
        {canScrollLeft && (
          <TouchableOpacity
            style={[styles.overlayArrow, styles.leftArrow]}
            onPress={scrollLeft}
            onPressIn={() => setLeftArrowPressed(true)}
            onPressOut={() => setLeftArrowPressed(false)}
            activeOpacity={1}
          >
            <LinearGradient
              colors={leftArrowPressed 
                ? ['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0)'] 
                : ['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Octicons 
                name="chevron-left" 
                size={48} 
                color="white" 
                style={[styles.arrowIcon, leftArrowPressed && styles.arrowIconPressed]} 
              />
            </LinearGradient>
          </TouchableOpacity>
        )}
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
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
        />
        {canScrollRight && (
          <TouchableOpacity
            style={[styles.overlayArrow, styles.rightArrow]}
            onPress={scrollRight}
            onPressIn={() => setRightArrowPressed(true)}
            onPressOut={() => setRightArrowPressed(false)}
            activeOpacity={1}
          >
            <LinearGradient
              colors={rightArrowPressed 
                ? ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.9)'] 
                : ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Octicons 
                name="chevron-right" 
                size={48} 
                color="white" 
                style={[styles.arrowIcon, rightArrowPressed && styles.arrowIconPressed]} 
              />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 28,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
    marginHorizontal: 16,
    marginTop: 0,
  },
  firstHeader: {
    marginTop: 55,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    alignSelf: 'center',
  },
  titleArrow: {
    opacity: 0.6,
    marginLeft: -4,
    alignSelf: 'center',
  },
  carouselContainer: {
    position: 'relative',
    minHeight: 135,
  },
  overlayArrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    zIndex: 100,
    elevation: 10,
  },
  leftArrow: {
    left: 0,
  },
  rightArrow: {
    right: 0,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    opacity: 0.9,
  },
  arrowIconPressed: {
    opacity: 1,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  separator: {
    width: 0,
  },
});
