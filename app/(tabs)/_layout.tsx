import { Tabs } from 'expo-router';
import React from 'react';

import { CustomLeftTabBar } from '@/components/custom-left-tab-bar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuth();

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
          href: isAuthenticated ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          href: isAuthenticated ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          href: !isAuthenticated ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          href: !isAuthenticated ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          href: !isAuthenticated ? null : undefined,
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
