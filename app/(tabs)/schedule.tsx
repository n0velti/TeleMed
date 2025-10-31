import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CalendarEvent, WeekCalendar } from '@/components/week-calendar';
import { useAppointments, type Appointment } from '@/hooks/use-appointments';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';

export default function ScheduleScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { appointments, isLoading: appointmentsLoading, error, fetchAppointments } = useAppointments();
  const hasFetchedRef = useRef(false);

  // Redirect unauthenticated users away from this screen
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(tabs)/account');
    }
  }, [authLoading, isAuthenticated]);

  // Fetch appointments when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAppointments();
    }
  }, [isAuthenticated, authLoading]);

  // Convert appointments to calendar events
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    if (!appointments) return [];
    
    return appointments.map((appointment) => {
      // Parse date and times to create Date objects
      const dateStr = appointment.appointmentDate || '';
      const startTime = appointment.startTime || '';
      const endTime = appointment.endTime || '';

      // Create start date
      const [year, month, day] = dateStr.split('-').map(Number);
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      const start = new Date(year, month - 1, day, startHour, startMin);
      const end = new Date(year, month - 1, day, endHour, endMin);

      // Create title with specialist name and purpose
      const purpose = appointment.purpose ? ` - ${appointment.purpose}` : '';
      const title = `${appointment.specialistName}${purpose}`;

      return {
        id: appointment.id,
        title: title,
        start: start,
        end: end,
        color: '#0a7ea4',
        data: appointment, // Store full appointment data for later use
      };
    });
  }, [appointments]);

  const handleEventPress = (event: CalendarEvent) => {
    const appointment = event.data as Appointment;
    if (appointment?.id) {
      router.push(`/appointment/${appointment.id}`);
    }
  };

  const handleTimeSlotPress = (date: Date) => {
    console.log('Time slot pressed:', date);
    // Could navigate to specialist selection or booking
  };

  const handleDateChange = (date: Date) => {
    console.log('Week changed to:', date);
    // Note: Appointments are already loaded, no need to refetch on week change
  };

  // Debug logging
  useEffect(() => {
    console.log('Schedule Screen State:', {
      isAuthenticated,
      authLoading,
      appointmentsLoading,
      appointmentCount: appointments?.length || 0,
      hasError: !!error,
    });
  }, [isAuthenticated, authLoading, appointmentsLoading, appointments, error]);

  // Show loading state
  if (authLoading || appointmentsLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
        <ThemedText style={styles.loadingText}>Loading appointments...</ThemedText>
      </ThemedView>
    );
  }

  // Show error state
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>Error loading appointments: {error.message}</ThemedText>
      </ThemedView>
    );
  }

  // If not authenticated, an immediate redirect occurs; render nothing
  if (!isAuthenticated) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <WeekCalendar
        events={calendarEvents}
        onEventPress={handleEventPress}
        onTimeSlotPress={handleTimeSlotPress}
        onDateChange={handleDateChange}
        startHour={0}
        endHour={23}
        hourRowHeight={60}
        mode="week"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    textAlign: 'center',
    color: 'red',
    marginTop: '50%',
    paddingHorizontal: 20,
    fontSize: 16,
  },
  messageText: {
    textAlign: 'center',
    marginTop: '50%',
    paddingHorizontal: 20,
    fontSize: 16,
    opacity: 0.6,
  },
});

