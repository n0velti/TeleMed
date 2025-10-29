import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './themed-text';

interface ScrollArrowProps {
  direction: 'left' | 'right';
  onPress: () => void;
  disabled?: boolean;
}

export function ScrollArrow({ direction, onPress, disabled = false }: ScrollArrowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const arrowSymbol = direction === 'left' ? '‹' : '›';

  return (
    <TouchableOpacity
      style={[
        styles.arrow,
        { backgroundColor: colors.background },
        disabled && styles.disabled,
        { pointerEvents: disabled ? 'none' : 'auto' },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <ThemedText style={[styles.arrowText, disabled && styles.disabledText]}>
        {arrowSymbol}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.3,
  },
  disabledText: {
    opacity: 0.5,
  },
});

