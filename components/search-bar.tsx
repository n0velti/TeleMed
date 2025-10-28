import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search specialists..." }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSearch = () => {
    onSearch?.(searchQuery);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch?.('');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <ThemedText style={styles.clearText}>✕</ThemedText>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  clearText: {
    fontSize: 16,
    opacity: 0.6,
  },
  searchButton: {
    padding: 4,
  },
  searchIcon: {
    fontSize: 16,
  },
});

