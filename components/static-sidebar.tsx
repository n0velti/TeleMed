import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Octicons from '@expo/vector-icons/Octicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function StaticSidebar() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, userEmail } = useAuth();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Conditionally show tabs based on authentication
  const tabs = isAuthenticated
    ? [
        { name: 'Home', route: '/(tabs)' },
        { name: 'Schedule', route: '/(tabs)/schedule' },
        { name: 'Messages', route: '/(tabs)/messages' },
        { name: 'Notifications', route: '/(tabs)/notifications' },
      ]
    : [
        { name: 'Home', route: '/(tabs)' },
        { name: 'Pricing', route: '/(tabs)/pricing' },
        { name: 'About', route: '/(tabs)/about' },
      ];

  const bottomButtons = [
    { name: 'Get Care Now', route: '/(tabs)/get-care', isGetCare: true },
    { name: isAuthenticated && userEmail ? userEmail : 'Account', route: '/(tabs)/account', isGetCare: false },
  ];

  const handleSearchToggle = () => {
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery('');
    }
  };

  const isDark = colorScheme === 'dark';
  
  return (
    <View style={[
      styles.container, 
      isSearchExpanded && styles.expandedContainer,
      { backgroundColor: isDark ? '#1a1a1a' : '#ffffff', borderRightColor: isDark ? '#333' : '#E0E0E0' }
    ]}>
      <View style={styles.headerRow}>
        <View style={styles.logoContainer}>
          <Octicons
            name="light-bulb"
            size={18}
            color={Colors[colorScheme ?? 'light'].text}
            style={styles.logoIcon}
          />
          <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
            Serphint
          </Text>
        </View>
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
          {tabs.map((tab) => (
            <React.Fragment key={tab.route}>
              <TouchableOpacity
                onPress={() => router.push(tab.route as any)}
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <Text style={styles.tabLabel}>
                  {tab.name}
                </Text>
              </TouchableOpacity>
              
              {/* Add search button after Home tab (first tab) */}
              {tab.name === 'Home' && (
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
          ))}
        </View>
      )}
      
      <View style={styles.bottomButtons}>
        {bottomButtons.map((button) => (
          <TouchableOpacity
            key={button.route}
            onPress={() => router.push(button.route as any)}
            style={button.isGetCare ? styles.getCareButton : styles.accountButton}
            activeOpacity={0.7}
          >
            <Text style={button.isGetCare ? styles.getCareText : styles.accountText}>
              {button.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 0,
    backgroundColor: 'white',
    borderRightWidth: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    flexDirection: 'column',
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  logoIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: '500',
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
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
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
    marginTop: 'auto',
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
});

