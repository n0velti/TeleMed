import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar, ICalendarEventBase } from 'react-native-big-calendar';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export interface CalendarEvent extends ICalendarEventBase {
  id?: string;
  color?: string;
  data?: any;
}

export interface WeekCalendarProps {
  events?: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onTimeSlotPress?: (date: Date) => void;
  onDateChange?: (date: Date) => void;
  startHour?: number;
  endHour?: number;
  hourRowHeight?: number;
  mode?: 'week' | 'day' | '3days' | 'month';
  initialDate?: Date;
}

export function WeekCalendar({
  events = [],
  onEventPress,
  onTimeSlotPress,
  onDateChange,
  startHour = 0,
  endHour = 23,
  hourRowHeight = 60,
  mode = 'week',
  initialDate,
}: WeekCalendarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // State to manage the current date for week navigation
  const [currentDate, setCurrentDate] = useState<Date>(initialDate || new Date());

  // Calculate calendar height (fills remaining space after header)
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = 80; // Approximate header + padding height
  const calendarHeight = screenHeight - headerHeight - 32; // Subtract header and padding

  // Theme customization based on app theme
  const theme = useMemo(() => {
    const colors = Colors[isDark ? 'dark' : 'light'];
    return {
      palette: {
        primary: {
          main: colors.tint,
          contrastText: '#fff',
        },
        nowIndicator: colors.tint,
        gray: {
          100: isDark ? '#2a2a2a' : '#f5f5f5',
          200: isDark ? '#3a3a3a' : '#e0e0e0',
          300: colors.icon,
          500: colors.icon,
          800: colors.text,
        },
        moreLabel: colors.tint,
      },
      typography: {
        xs: {
          fontSize: 10,
          fontWeight: '500' as const,
        },
        sm: {
          fontSize: 12,
          fontWeight: '400' as const,
        },
        xl: {
          fontSize: 16,
          fontWeight: '600' as const,
        },
        moreLabel: {
          fontSize: 12,
          fontWeight: '600' as const,
        },
      },
    };
  }, [isDark]);

  // Transform events to match library format
  const transformedEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: event.start,
      end: event.end,
      title: event.title,
    }));
  }, [events]);

  // Handle week navigation via date change
  const handleDateChange = (dateRange: [Date, Date]) => {
    const newDate = dateRange[0];
    setCurrentDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  // Handle swipe to change weeks
  const handleSwipeEnd = (date: Date) => {
    setCurrentDate(date);
    if (onDateChange) {
      onDateChange(date);
    }
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  // Get Saturday of current week for display
  const getWeekRange = () => {
    const saturday = new Date(currentDate);
    const day = saturday.getDay();
    const daysToSubtract = day === 6 ? 0 : day === 0 ? 1 : day + 1;
    saturday.setDate(currentDate.getDate() - daysToSubtract);
    
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 6);
    
    return { saturday, sunday };
  };

  const { saturday, sunday } = getWeekRange();
  const colors = Colors[isDark ? 'dark' : 'light'];
  const tintColor = colors.tint;

  return (
    <ThemedView style={styles.container}>
      {/* Week Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
          <ThemedText style={[styles.navButtonText, { color: tintColor }]}>‹ Prev</ThemedText>
        </TouchableOpacity>
        
        <View style={styles.headerDate}>
          <ThemedText type="subtitle">
            {saturday.toLocaleDateString('default', { month: 'long', day: 'numeric' })} -{' '}
            {sunday.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
          </ThemedText>
        </View>
        
        <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
          <ThemedText style={[styles.navButtonText, { color: tintColor }]}>Next ›</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.calendarWrapper}>
        <Calendar
          events={transformedEvents}
          height={calendarHeight}
          mode={mode}
          date={currentDate}
          weekStartsOn={6} // Saturday = 6 (Sunday = 0, Monday = 1, ..., Saturday = 6)
          weekEndsOn={0} // Sunday = 0
          hourRowHeight={hourRowHeight}
          minHour={startHour}
          maxHour={endHour}
          ampm={true}
          swipeEnabled={true}
          showTime={true}
          onPressEvent={onEventPress}
          onPressCell={onTimeSlotPress}
          onChangeDate={handleDateChange}
          onSwipeEnd={handleSwipeEnd}
          theme={theme}
          eventCellStyle={(event: CalendarEvent) => ({
            backgroundColor: event.color || Colors[isDark ? 'dark' : 'light'].tint,
            borderRadius: 4,
            padding: 4,
          })}
          eventCellTextColor="#fff"
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
    minWidth: 60,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerDate: {
    flex: 1,
    alignItems: 'center',
  },
  calendarWrapper: {
    flex: 1,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
});

