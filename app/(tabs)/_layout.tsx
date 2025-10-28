import { Tabs } from 'expo-router';
import React from 'react';

import { CustomLeftTabBar } from '@/components/custom-left-tab-bar';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarPosition: 'left',
      }}
      tabBar={(props) => <CustomLeftTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        
        }}
      
      />

      <Tabs.Screen
        name="pricing"
        options={{
          title: 'Pricing',
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
        }}
      />
      <Tabs.Screen
        name="get-care"
        options={{
          title: 'Get Care Now',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
        }}
      />
    </Tabs>
  );
}
