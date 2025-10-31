import { StaticSidebar } from '@/components/static-sidebar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppointments, type Appointment } from '@/hooks/use-appointments';
import { useAuth } from '@/hooks/use-auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { appointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointments();
  const { isAuthenticated } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);

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

  if (appointmentsLoading) {
    return (
      <View style={styles.wrapper}>
        <Stack.Screen options={{ headerShown: false }} />
        <StaticSidebar />
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
        <StaticSidebar />
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

  const getGradientColors = (): readonly [string, string] => {
    return ['#667eea', '#764ba2'];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
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

  const gradientColors = getGradientColors();

  return (
    <View style={styles.wrapper}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <StaticSidebar />
      <ThemedView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.appointmentContainer}>
            {/* Compact Header Card */}
            <ThemedView style={styles.headerCard}>
              <View style={styles.headerLeft}>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.miniAvatar}
                >
                  <ThemedText style={styles.miniInitials}>
                    {appointment.specialistName?.split(' ').map(n => n[0]).join('') || 'DR'}
                  </ThemedText>
                </LinearGradient>
                <View style={styles.headerText}>
                  <ThemedText style={styles.headerName}>{appointment.specialistName || 'Unknown Specialist'}</ThemedText>
                  <ThemedText style={styles.headerSub}>{appointment.specialistSpecialty || 'N/A'}</ThemedText>
                </View>
              </View>
              {appointment.status && (
                <View style={[styles.statusPill, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                  <ThemedText style={[styles.statusPillText, { color: getStatusColor(appointment.status) }]}>
                    {appointment.status}
                  </ThemedText>
                </View>
              )}
            </ThemedView>

            {/* Quick Facts Row */}
            <View style={styles.quickRow}>
              <View style={styles.quickItem}>
                <ThemedText style={styles.quickLabel}>Date</ThemedText>
                <ThemedText style={styles.quickValue}>{formatDate(appointment.appointmentDate)}</ThemedText>
              </View>
              <View style={styles.quickItem}>
                <ThemedText style={styles.quickLabel}>Time</ThemedText>
                <ThemedText style={styles.quickValue}>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</ThemedText>
              </View>
              <View style={styles.quickItem}>
                <ThemedText style={styles.quickLabel}>Duration</ThemedText>
                <ThemedText style={styles.quickValue}>{appointment.duration || 'N/A'}</ThemedText>
              </View>
            </View>

            {/* Purpose Card (optional) */}
            {appointment.purpose && (
              <ThemedView style={styles.card}>
                <ThemedText style={styles.cardTitle}>Purpose</ThemedText>
                <ThemedText style={styles.cardBody}>{appointment.purpose}</ThemedText>
              </ThemedView>
            )}

            {/* Notes Card (optional) */}
            {appointment.notes && (
              <ThemedView style={styles.card}>
                <ThemedText style={styles.cardTitle}>Notes</ThemedText>
                <ThemedText style={styles.cardBody}>{appointment.notes}</ThemedText>
              </ThemedView>
            )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.joinButtonSmall}
              onPress={handleJoinCall}
              activeOpacity={0.9}
            >
              <ThemedText style={styles.joinButtonSmallText}>Join Video Call</ThemedText>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appointmentContainer: {
    width: '100%',
    maxWidth: 600,
  },
  headerCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  miniAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    opacity: 0.6,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
  },
  quickItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.12)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  quickLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  quickValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.12)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    opacity: 0.85,
    lineHeight: 20,
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.12)',
  },
  joinButton: {
    backgroundColor: '#0095f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0095f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  spacer: {
    height: 30,
  },
  actionsRow: {
    marginTop: 12,
    marginHorizontal: 20,
    alignItems: 'flex-end',
  },
  joinButtonSmall: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonSmallText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
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

