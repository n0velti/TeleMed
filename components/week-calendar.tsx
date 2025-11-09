import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar, ICalendarEventBase } from 'react-native-big-calendar';
import { Dropdown } from 'react-native-element-dropdown';
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  // State for the calendar picker view (month/year being viewed)
  const [pickerViewDate, setPickerViewDate] = useState<Date>(currentDate);

  // Calculate calendar height (reduced but still functional)
  const screenHeight = Dimensions.get('window').height;
  const headerHeight = 80; // Approximate header + padding height
  const availableHeight = screenHeight - headerHeight - 32;
  // Use a reasonable height that allows scrolling - smaller than full but still usable
  const calendarHeight = Math.max(availableHeight * 0.75, 600); // At least 600px or 75% of available space

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

  // Handle date selection from calendar picker
  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
    setShowDatePicker(false);
    if (onDateChange) {
      onDateChange(date);
    }
  };

  // Initialize picker view date when modal opens
  useEffect(() => {
    if (showDatePicker) {
      setPickerViewDate(currentDate);
    }
  }, [showDatePicker, currentDate]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(pickerViewDate);
    newDate.setMonth(pickerViewDate.getMonth() - 1);
    setPickerViewDate(newDate);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(pickerViewDate);
    newDate.setMonth(pickerViewDate.getMonth() + 1);
    setPickerViewDate(newDate);
  };

  // Handle year change from dropdown
  const handleYearChange = (year: number) => {
    const newDate = new Date(pickerViewDate);
    newDate.setFullYear(year);
    setPickerViewDate(newDate);
  };

  // Handle "Today" button - navigate to today's date
  const handleTodayPress = () => {
    const today = new Date();
    setPickerViewDate(today);
  };

  // Generate year options for dropdown (current year ± 10 years)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push({ label: i.toString(), value: i });
    }
    return years;
  }, []);

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
        <ThemedText type="title" style={styles.monthLabel}>Month</ThemedText>
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          style={[styles.datePickerButton, { 
            backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
            borderColor: isDark ? '#444' : '#ddd'
          }]}
        >
          <ThemedText type="subtitle" style={styles.datePickerText}>
            {saturday.toLocaleDateString('default', { month: 'short', day: 'numeric' })} -{' '}
            {sunday.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
          </ThemedText>
          <ThemedText style={[styles.dropdownIcon, { color: tintColor }]}>▼</ThemedText>
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

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowDatePicker(false)}
        >
          <Pressable 
            style={[styles.modalContent, {
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
            }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>Select Date</ThemedText>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={[styles.closeButton, { cursor: 'pointer' }]}
              >
                <ThemedText style={[styles.closeButtonText, { color: tintColor }]}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            {/* Today Button */}
            <TouchableOpacity 
              onPress={handleTodayPress}
              style={[styles.todayButton, {
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                borderColor: isDark ? '#444' : '#ddd',
                cursor: 'pointer',
              }]}
            >
              <ThemedText style={[styles.todayButtonText, { color: tintColor }]}>Today</ThemedText>
            </TouchableOpacity>
            
            {/* Month/Year Navigation */}
            <View style={styles.monthYearContainer}>
              <TouchableOpacity 
                onPress={goToPreviousMonth}
                style={[styles.monthNavButton, { cursor: 'pointer' }]}
              >
                <ThemedText style={[styles.monthNavIcon, { color: tintColor }]}>‹</ThemedText>
              </TouchableOpacity>
              
              <View style={styles.monthYearDisplay}>
                <ThemedText type="subtitle" style={styles.monthText}>
                  {pickerViewDate.toLocaleDateString('default', { month: 'long' })}
                </ThemedText>
                <Dropdown
                  style={[styles.yearDropdown, {
                    backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                    borderColor: isDark ? '#444' : '#ddd',
                    cursor: 'pointer',
                  }]}
                  data={yearOptions}
                  labelField="label"
                  valueField="value"
                  placeholder={pickerViewDate.getFullYear().toString()}
                  value={pickerViewDate.getFullYear()}
                  onChange={(item) => handleYearChange(item.value)}
                  selectedTextStyle={{ 
                    color: Colors[isDark ? 'dark' : 'light'].text, 
                    fontSize: 16,
                    fontWeight: '600'
                  }}
                  itemTextStyle={{ 
                    color: Colors[isDark ? 'dark' : 'light'].text, 
                    fontSize: 14
                  }}
                  containerStyle={[styles.yearDropdownContainer, {
                    backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
                    borderColor: isDark ? '#444' : '#ddd'
                  }]}
                />
              </View>
              
              <TouchableOpacity 
                onPress={goToNextMonth}
                style={[styles.monthNavButton, { cursor: 'pointer' }]}
              >
                <ThemedText style={[styles.monthNavIcon, { color: tintColor }]}>›</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.calendarPickerContainer}>
              <Calendar
                events={[]}
                height={300}
                mode="month"
                date={pickerViewDate}
                weekStartsOn={6}
                weekEndsOn={0}
                ampm={true}
                showTime={false}
                onPressCell={(date) => handleDateSelect(date)}
                theme={theme}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  monthLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    gap: 8,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownIcon: {
    fontSize: 10,
    marginLeft: 4,
  },
  calendarWrapper: {
    flex: 1,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 600,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  todayButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  calendarPickerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 16,
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  monthNavButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  monthYearDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  yearDropdown: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  yearDropdownContainer: {
    borderRadius: 6,
    marginTop: 4,
    maxHeight: 200,
  },
});

