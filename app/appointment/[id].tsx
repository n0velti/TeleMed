import { CustomLeftTabBar } from '@/components/custom-left-tab-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppointments, type Appointment } from '@/hooks/use-appointments';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Octicons from '@expo/vector-icons/Octicons';
import type { BottomTabNavigationState } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointments();
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  
  // Get the actual tab state from the navigation tree
  const tabState = React.useMemo(() => {
    let parent = navigation.getParent();
    while (parent) {
      const state = parent.getState();
      if (state && 'routes' in state) {
        const routes = (state as any).routes;
        const routeNames = routes.map((r: any) => r.name);
        // Check if this is the tab navigator (has routes like 'index', 'schedule', etc.)
        if (routeNames.includes('index') || routeNames.includes('schedule') || routeNames.includes('messages')) {
          return state as BottomTabNavigationState;
        }
        // Check if this contains the (tabs) route
        const tabsRoute = routes.find((r: any) => r.name === '(tabs)');
        if (tabsRoute && tabsRoute.state) {
          return tabsRoute.state as BottomTabNavigationState;
        }
      }
      parent = parent.getParent();
    }
    return undefined;
  }, [navigation]) as BottomTabNavigationState | undefined;
  
  // Create a navigation object that can navigate to tabs using router
  const tabNavigator = React.useMemo(() => {
    return {
      navigate: (name: string, params?: any) => {
        // Navigate to the tab route - use replace to go back to tabs from detail page
        // For index route, navigate to /(tabs) which is the home tab
        if (name === 'index') {
          router.replace('/(tabs)' as any);
        } else {
          router.replace(`/(tabs)/${name}` as any);
        }
      },
      jumpTo: (name: string, params?: any) => {
        // Same as navigate - replace current route to go back to tabs
        if (name === 'index') {
          router.replace('/(tabs)' as any);
        } else {
          router.replace(`/(tabs)/${name}` as any);
        }
      },
      emit: (event: any) => {
        // Emit navigation events (used by CustomLeftTabBar)
        return { defaultPrevented: false };
      },
      dispatch: (action: any) => {
        // Handle navigation actions
        if (action.type === 'NAVIGATE' || action.type === 'JUMP_TO') {
          const routeName = action.payload?.name || action.payload?.routeName;
          if (routeName) {
            if (routeName === 'index') {
              router.replace('/(tabs)' as any);
            } else {
              router.replace(`/(tabs)/${routeName}` as any);
            }
          }
        }
      },
      getParent: () => navigation.getParent(),
      getState: () => tabState,
    } as any;
  }, [navigation, router, tabState]);
  
  // Create mock descriptors for CustomLeftTabBar, filtering out the "(tabs)" route
  // Use the same navigation object for all descriptors
  // Map route names to their display titles
  const routeTitleMap: Record<string, string> = {
    'index': 'Home',
    'schedule': 'Appointments',
    'messages': 'Messages',
    'notifications': 'Notifications',
    'medical-records': 'Medical Records',
    'prescriptions': 'Prescriptions',
    'pricing': 'Pricing',
    'about': 'About',
    'get-care': 'Get Care Now',
    'account': 'Account',
  };
  
  const mockDescriptors = React.useMemo(() => {
    if (!tabState || !tabNavigator) return {};
    const filteredRoutes = tabState.routes.filter(route => route.name !== '(tabs)');
    return filteredRoutes.reduce((acc, route) => {
      acc[route.key] = {
        options: {
          title: routeTitleMap[route.name] || route.name, // Use mapped title or fallback to route name
        },
        navigation: tabNavigator, // Use the same navigation object
        route,
      };
      return acc;
    }, {} as any);
  }, [tabState, tabNavigator]);
  
  // Filter the tab state to exclude the "(tabs)" route
  // Don't highlight any tab when viewing appointment details (set index to -1 or a non-existent index)
  const filteredTabState = React.useMemo(() => {
    if (!tabState) return undefined;
    const filteredRoutes = tabState.routes.filter(route => route.name !== '(tabs)');
    if (filteredRoutes.length === 0) return undefined;
    
    // Set index to -1 so no tab is highlighted when viewing appointment details
    return {
      ...tabState,
      routes: filteredRoutes,
      index: -1, // No tab selected when viewing appointment detail
    } as BottomTabNavigationState;
  }, [tabState]);

  // Fetch appointments and find the specific appointment
  useEffect(() => {
    if (isAuthenticated && !appointmentsLoading && appointments.length === 0) {
      fetchAppointments();
    }
  }, [isAuthenticated, appointmentsLoading, appointments.length, fetchAppointments]);

  useEffect(() => {
    if (appointments && id) {
      const foundAppointment = appointments.find(apt => apt.id === id);
      setAppointment(foundAppointment || null);
    }
  }, [appointments, id]);

  // Render CustomLeftTabBar if we have tab state
  const renderTabBar = () => {
    if (filteredTabState && tabNavigator && Object.keys(mockDescriptors).length > 0) {
      return (
        <CustomLeftTabBar
          state={filteredTabState}
          descriptors={mockDescriptors}
          navigation={tabNavigator as any}
        />
      );
    }
    return null;
  };

  if (appointmentsLoading) {
    return (
      <View style={styles.wrapper}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderTabBar()}
        <ThemedView style={styles.container}>
          <ActivityIndicator size="large" style={styles.loader} />
          <ThemedText style={styles.loadingText}>Loading appointment...</ThemedText>
        </ThemedView>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={styles.wrapper}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderTabBar()}
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>Appointment not found</ThemedText>
        </ThemedView>
      </View>
    );
  }

  /**
   * Handle joining video call
   * Navigates to the video call screen with the appointment ID
   * Security: Only allows joining if user is authenticated and appointment exists
   */
  const handleJoinCall = () => {
    if (!appointment?.id) {
      Alert.alert('Error', 'Appointment information is missing.');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please sign in to join the video call.');
      return;
    }

    // Validate appointment status - only allow joining if confirmed
    if (appointment.status?.toLowerCase() !== 'confirmed') {
      Alert.alert(
        'Appointment Not Available',
        `This appointment is ${appointment.status || 'not confirmed'}. Please contact support if you believe this is an error.`
      );
      return;
    }

    // Navigate to video call screen
    // The video call screen will handle meeting creation and Chime SDK initialization
    router.push(`/video-call/${appointment.id}`);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      // Show short date format: "Nov 3, 2025" to match schedule tab
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'N/A';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.wrapper}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      {renderTabBar()}
      <ThemedView style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.appointmentContainer}>
            {/* Main Info Card */}
            <ThemedView 
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                }
              ]}
            >
              {/* Doctor Header */}
              <View style={styles.doctorHeader}>
                <View style={styles.doctorInfo}>
                  <ThemedText style={styles.doctorName}>
                    {appointment.specialistName || 'Unknown Specialist'}
                  </ThemedText>
                  <ThemedText style={styles.doctorSpecialty}>
                    {appointment.specialistSpecialty || 'N/A'}
                  </ThemedText>
                </View>
                {appointment.status && (
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: getStatusColor(appointment.status) }]}>
                      {appointment.status}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Appointment Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <Octicons 
                      name="calendar" 
                      size={16} 
                      color={isDark ? '#9BA1A6' : '#687076'} 
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText style={styles.detailLabel}>Date</ThemedText>
                    <ThemedText style={styles.detailValue}>{formatDate(appointment.appointmentDate)}</ThemedText>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <Octicons 
                      name="clock" 
                      size={16} 
                      color={isDark ? '#9BA1A6' : '#687076'} 
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText style={styles.detailLabel}>Time</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <Octicons 
                      name="hourglass" 
                      size={16} 
                      color={isDark ? '#9BA1A6' : '#687076'} 
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText style={styles.detailLabel}>Duration</ThemedText>
                    <ThemedText style={styles.detailValue}>{appointment.duration || 'N/A'}</ThemedText>
                  </View>
                </View>
              </View>
            </ThemedView>

            {/* Purpose Card */}
            {appointment.purpose && (
              <>
                <View 
                  style={[
                    styles.divider,
                    {
                      backgroundColor: isDark ? '#2a2a2a' : '#e5e5e5',
                    }
                  ]} 
                />
                <ThemedView 
                  style={[
                    styles.card,
                    styles.cardSpaced,
                    {
                      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    }
                  ]}
                >
                  <ThemedText style={styles.cardTitle}>Purpose</ThemedText>
                  <ThemedText style={styles.cardText}>{appointment.purpose}</ThemedText>
                </ThemedView>
              </>
            )}

            {/* Notes Card */}
            {appointment.notes && (
              <ThemedView 
                style={[
                  styles.card,
                  styles.cardSpaced,
                  {
                    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                  }
                ]}
              >
                <ThemedText style={styles.cardTitle}>Notes</ThemedText>
                <ThemedText style={styles.cardText}>{appointment.notes}</ThemedText>
              </ThemedView>
            )}

            {/* Join Call Button */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.joinButton}
                onPress={handleJoinCall}
                activeOpacity={0.7}
              >
                <Octicons 
                  name="video" 
                  size={14} 
                  color={isDark ? '#0a7ea4' : '#0a7ea4'} 
                />
                <ThemedText 
                  style={styles.joinButtonText}
                  lightColor="#0a7ea4"
                  darkColor="#0a7ea4"
                >
                  Join Video Call
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  container: {
    flex: 1,
    minWidth: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: 'center',
  },
  appointmentContainer: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  divider: {
    height: 1,
    marginTop: 8,
    marginBottom: 16,
    width: '100%',
    maxWidth: 680,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardSpaced: {
    marginTop: 0,
  },
  doctorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  doctorSpecialty: {
    fontSize: 15,
    fontWeight: '400',
    opacity: 0.6,
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    paddingTop: 2,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.6,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  cardText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    opacity: 0.8,
    letterSpacing: -0.1,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 0,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  spacer: {
    height: 30,
  },
  loader: {
    marginTop: '50%',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.6,
  },
});

