import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function CustomLeftTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Separate regular tabs from bottom tabs
  const regularTabs = state.routes.slice(0, -2);
  const bottomTabs = state.routes.slice(-2);

  const handleSearchToggle = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery('');
    }
  };

  return (
    <View style={[styles.container, isSearchExpanded && styles.expandedContainer]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
          TeleMed
        </Text>
        {isSearchExpanded && (
          <TouchableOpacity onPress={handleSearchToggle} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearchExpanded ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search specialists, specialties..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <ScrollView style={styles.searchResults}>
            {searchQuery.trim() ? (
              <View style={styles.searchResultItem}>
                <Text style={styles.searchResultText}>Search for: {searchQuery}</Text>
              </View>
            ) : (
              <View style={styles.searchHint}>
                <Text style={styles.searchHintText}>
                  Try searching for specialists by name or specialty
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.tabsContainer}>
          {regularTabs.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title !== undefined 
              ? options.title 
              : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <React.Fragment key={route.key}>
                <PlatformPressable
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  pressOpacity={1}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  onPressIn={(ev) => {
                    if (process.env.EXPO_OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[
                    styles.tabButton,
                    isFocused && styles.activeTabButton
                  ]}
                  android_ripple={null}
                  pressRetentionOffset={0}
                >
                  <Text style={[
                    styles.tabLabel,
                    { 
                      color: isFocused ? 'black' : '#666666'
                    }
                  ]}>
                    {label}
                  </Text>
                </PlatformPressable>
                
                {/* Add search button after Home tab (first tab) */}
                {index === 0 && (
                  <TouchableOpacity
                    onPress={handleSearchToggle}
                    style={styles.searchButton}
                    accessibilityRole="button"
                    accessibilityLabel="Search"
                  >
                    <Text style={styles.searchButtonLabel}>Search</Text>
                  </TouchableOpacity>
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
      
      <View style={styles.bottomButtons}>
        {bottomTabs.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title !== undefined 
            ? options.title 
            : route.name;

          const isFocused = state.index === state.routes.length - 2 + index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const isGetCare = route.name === 'get-care';

          return (
            <PlatformPressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              pressOpacity={1}
              onPress={onPress}
              onLongPress={onLongPress}
              onPressIn={(ev) => {
                if (process.env.EXPO_OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[
                isGetCare ? styles.getCareButton : styles.accountButton,
                isFocused && (isGetCare ? styles.activeGetCareButton : styles.activeBottomButton)
              ]}
              android_ripple={null}
              pressRetentionOffset={0}
            >
              <Text style={[
                isGetCare ? styles.getCareText : styles.accountText,
                isFocused && styles.activeBottomText
              ]}>
                {label}
              </Text>
            </PlatformPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    paddingTop: 20,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  expandedContainer: {
    width: 500,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 19,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  closeButton: {
    padding: 8,
    paddingRight: 12,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '600',
  },
  tabsContainer: {
    flex: 1,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTabButton: {
    borderColor: 'black',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  searchContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultText: {
    fontSize: 14,
    color: '#333',
  },
  searchHint: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  searchHintText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  bottomButtons: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  getCareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#FFE5E5',
  },
  getCareText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'red',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F5F5F5',
  },
  accountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeBottomButton: {
    borderWidth: 1,
    borderColor: 'black',
  },
  activeGetCareButton: {
    borderWidth: 1,
    borderColor: 'red',
  },
  activeBottomText: {
    fontWeight: '600',
  },
});
