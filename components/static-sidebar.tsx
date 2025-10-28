import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function StaticSidebar() {
  const colorScheme = useColorScheme();

  const tabs = [
    { name: 'Home', route: '/(tabs)' },
    { name: 'Pricing', route: '/(tabs)/pricing' },
    { name: 'About', route: '/(tabs)/about' },
  ];

  const bottomButtons = [
    { name: 'Get Care Now', route: '/(tabs)/get-care', isGetCare: true },
    { name: 'Account', route: '/(tabs)/account', isGetCare: false },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
        TeleMed
      </Text>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.route}
            onPress={() => router.push(tab.route as any)}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <Text style={styles.tabLabel}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
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
    width: 220,
    paddingTop: 20,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  title: {
    fontSize: 19,
    fontWeight: '500',
    marginBottom: 40,
    paddingHorizontal: 12,
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
});

