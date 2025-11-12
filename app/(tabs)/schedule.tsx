import Octicons from '@expo/vector-icons/Octicons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useAppointments, type Appointment } from '@/hooks/use-appointments';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router, useFocusEffect } from 'expo-router';

export type MonthFilter = 'all' | string; // 'all' or 'YYYY-MM' format
export type DateOrderFilter = 'upcoming-first' | 'oldest-first' | 'newest-first';

export default function ScheduleScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { appointments, isLoading: appointmentsLoading, error, fetchAppointments } = useAppointments();
  const hasFetchedRef = useRef(false);
  const colorScheme = useColorScheme();
  const [monthFilter, setMonthFilter] = useState<MonthFilter>('all');
  const [dateOrderFilter, setDateOrderFilter] = useState<DateOrderFilter>('upcoming-first');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Sample appointments for testing
  const sampleAppointments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Upcoming appointment (tomorrow)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    // Get next month for the 2 appointments in same month
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const nextMonthDate1 = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
    const nextMonthDate2 = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 22);
    
    const nextMonthDate1Str = `${nextMonthDate1.getFullYear()}-${String(nextMonthDate1.getMonth() + 1).padStart(2, '0')}-${String(nextMonthDate1.getDate()).padStart(2, '0')}`;
    const nextMonthDate2Str = `${nextMonthDate2.getFullYear()}-${String(nextMonthDate2.getMonth() + 1).padStart(2, '0')}-${String(nextMonthDate2.getDate()).padStart(2, '0')}`;

    return [
      // Upcoming appointment (tomorrow)
      {
        id: 'sample-upcoming',
        specialistId: '1',
        specialistName: 'Dr. Sarah Johnson',
        specialistSpecialty: 'General Practice',
        specialistPrice: 75,
        appointmentDate: tomorrowDateStr,
        startTime: '14:00',
        endTime: '14:30',
        duration: '30 minutes',
        purpose: 'Annual checkup',
        status: 'confirmed',
      },
      // Two appointments in the same month (next month)
      {
        id: 'sample-month-1',
        specialistId: '2',
        specialistName: 'Dr. Michael Chen',
        specialistSpecialty: 'Family Medicine',
        specialistPrice: 85,
        appointmentDate: nextMonthDate1Str,
        startTime: '10:00',
        endTime: '10:30',
        duration: '30 minutes',
        purpose: 'Follow-up consultation',
        status: 'confirmed',
      },
      {
        id: 'sample-month-2',
        specialistId: '3',
        specialistName: 'Dr. Emily Rodriguez',
        specialistSpecialty: 'Internal Medicine',
        specialistPrice: 70,
        appointmentDate: nextMonthDate2Str,
        startTime: '15:30',
        endTime: '16:00',
        duration: '30 minutes',
        purpose: 'General consultation',
        status: 'confirmed',
      },
    ] as Appointment[];
  }, []);

  // Merge sample appointments with fetched appointments
  const allAppointments = useMemo(() => {
    const fetchedIds = new Set(appointments.map(apt => apt.id));
    const uniqueSamples = sampleAppointments.filter(sample => !fetchedIds.has(sample.id));
    return [...appointments, ...uniqueSamples];
  }, [appointments, sampleAppointments]);

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
  }, [isAuthenticated, authLoading, fetchAppointments]);

  // Refresh appointments when screen comes into focus (e.g., after booking)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && !authLoading) {
        fetchAppointments();
      }
    }, [isAuthenticated, authLoading, fetchAppointments])
  );

  // Get available months from appointments
  const availableMonths = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0) return [];
    
    const monthSet = new Set<string>();
    allAppointments.forEach((apt) => {
      const dateStr = apt.appointmentDate || '';
      if (dateStr) {
        try {
          const date = new Date(dateStr + 'T00:00:00');
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          monthSet.add(JSON.stringify({ value: monthKey, label: monthLabel }));
        } catch {
          // Skip invalid dates
        }
      }
    });
    
    return Array.from(monthSet)
      .map(str => JSON.parse(str))
      .sort((a, b) => {
        // Sort by date descending (newest first)
        return b.value.localeCompare(a.value);
      });
  }, [allAppointments]);

  // Filter and sort appointments based on filters
  const sortedAppointments = useMemo(() => {
    if (!allAppointments || allAppointments.length === 0) return [];

    const now = new Date();
    
    // Filter by month
    let filtered = allAppointments;
    if (monthFilter !== 'all') {
      filtered = allAppointments.filter((apt) => {
        const dateStr = apt.appointmentDate || '';
        if (!dateStr) return false;
        try {
          const date = new Date(dateStr + 'T00:00:00');
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          return monthKey === monthFilter;
        } catch {
          return false;
        }
      });
    }
    
    // Sort based on date order filter
    // IMPORTANT: Sort by month first to ensure all appointments from same month are consecutive
    return [...filtered].sort((a, b) => {
      const dateA = a.appointmentDate || '';
      const timeA = a.startTime || '';
      const dateB = b.appointmentDate || '';
      const timeB = b.startTime || '';

      // Parse dates and times
      const [yearA, monthA, dayA] = dateA.split('-').map(Number);
      const [hourA, minA] = (timeA || '00:00').split(':').map(Number);
      const [yearB, monthB, dayB] = dateB.split('-').map(Number);
      const [hourB, minB] = (timeB || '00:00').split(':').map(Number);

      if (isNaN(yearA) || isNaN(monthA) || isNaN(dayA) || isNaN(yearB) || isNaN(monthB) || isNaN(dayB)) {
        return 0;
      }

      const dateTimeA = new Date(yearA, monthA - 1, dayA, hourA || 0, minA || 0);
      const dateTimeB = new Date(yearB, monthB - 1, dayB, hourB || 0, minB || 0);

      // Create month keys for comparison (YYYY-MM format)
      const monthKeyA = `${yearA}-${String(monthA).padStart(2, '0')}`;
      const monthKeyB = `${yearB}-${String(monthB).padStart(2, '0')}`;

      if (dateOrderFilter === 'upcoming-first') {
        // Sort chronologically from past to future (oldest to newest)
        // This ensures all appointments are in chronological order
        return dateTimeA.getTime() - dateTimeB.getTime();
      } else if (dateOrderFilter === 'oldest-first') {
        // Sort by date ascending (oldest first) - this naturally groups by month
        return dateTimeA.getTime() - dateTimeB.getTime();
      } else {
        // Sort by date descending (newest first) - this naturally groups by month
        return dateTimeB.getTime() - dateTimeA.getTime();
      }
    });
  }, [allAppointments, monthFilter, dateOrderFilter]);

  // Find the next upcoming appointment
  const nextAppointmentId = useMemo(() => {
    if (!sortedAppointments || sortedAppointments.length === 0) return null;
    
    const now = new Date();
    for (const appointment of sortedAppointments) {
      const dateStr = appointment.appointmentDate || '';
      const timeStr = appointment.startTime || '';
      if (!dateStr) continue;
      
      try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
        const appointmentDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0);
        
        if (appointmentDateTime >= now) {
          return appointment.id;
        }
      } catch {
        continue;
      }
    }
    
    return null;
  }, [sortedAppointments]);

  // Create flat list of appointments without section headers
  const listDataWithSections = useMemo(() => {
    if (!sortedAppointments || sortedAppointments.length === 0) return [];

    return sortedAppointments.map((appointment) => ({
      type: 'appointment' as const,
      data: appointment,
    }));
  }, [sortedAppointments]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      
      // Show short date format: "Nov 3, 2025"
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
      return `${displayHour}:${minutes || '00'} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const getDaysUntilAppointment = (dateStr?: string, timeStr?: string): string => {
    if (!dateStr) return '';
    
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = (timeStr || '00:00').split(':').map(Number);
      const appointmentDate = new Date(year, month - 1, day, hours || 0, minutes || 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const appointmentDateOnly = new Date(year, month - 1, day);
      appointmentDateOnly.setHours(0, 0, 0, 0);
      
      const diffTime = appointmentDateOnly.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        const daysAgo = Math.abs(diffDays);
        return `${daysAgo}d ago`;
      } else if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Tomorrow';
      } else {
        return `In ${diffDays}d`;
      }
    } catch {
      return '';
    }
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    if (appointment?.id) {
      router.push(`/appointment/${appointment.id}`);
    }
  };

  const renderSectionHeader = ({ monthYear, isFirst }: { monthYear: string; isFirst?: boolean }) => {
    const isDark = colorScheme === 'dark';
    
    // Parse month and year from "Month Year" format
    const parts = monthYear.split(' ');
    const monthRaw = parts[0] || '';
    // Capitalize first letter, lowercase the rest
    const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1).toLowerCase();
    const year = parts[1] || '';
    
    return (
      <View style={[styles.sectionContainer, isFirst && styles.sectionContainerFirst]}>
        <View style={styles.sectionLabelContainer}>
          <ThemedText style={styles.sectionMonth}>{month}</ThemedText>
          <ThemedText style={styles.sectionYear}>{year}</ThemedText>
        </View>
        <View style={[styles.sectionLine, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
      </View>
    );
  };


  const renderTableHeader = () => {
    const isDark = colorScheme === 'dark';
    return (
      <View style={[styles.tableHeader, { borderBottomColor: isDark ? '#2a2a2a' : '#f0f0f0' }]}>
        <View style={styles.headerDate}>
          <ThemedText style={styles.headerDateText}>Date</ThemedText>
        </View>
        <View style={styles.headerDoctor}>
          <ThemedText style={styles.headerDoctorText}>Doctor</ThemedText>
        </View>
        <View style={styles.headerSpecialty}>
          <ThemedText style={styles.headerSpecialtyText}>Specialty</ThemedText>
        </View>
        <View style={styles.headerTime}>
          <ThemedText style={styles.headerTimeText}>Time</ThemedText>
        </View>
        <View style={styles.headerStatus}>
          <ThemedText style={styles.headerStatusText}>Status</ThemedText>
        </View>
        <View style={styles.headerArrow} />
      </View>
    );
  };

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const isDark = colorScheme === 'dark';
    const daysUntil = getDaysUntilAppointment(item.appointmentDate, item.startTime);
    const isNext = item.id === nextAppointmentId;
    
    // Determine if appointment is upcoming or past
    const dateStr = item.appointmentDate || '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const appointmentDate = new Date(year, month - 1, day);
    appointmentDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isUpcoming = appointmentDate >= today;
    
    // Get color for days until based on urgency and past/future
    const getDaysUntilColor = (daysUntilStr: string | null, isUpcoming: boolean) => {
      if (!daysUntilStr) return undefined;
      
      // Past appointments - use muted gray
      if (!isUpcoming) {
        return isDark ? '#666' : '#999';
      }
      
      // Future appointments - color code by urgency
      // Extract number from string like "2d" or "1w"
      const daysMatch = daysUntilStr.match(/(\d+)/);
      if (!daysMatch) return '#0a7ea4';
      
      const days = parseInt(daysMatch[1]);
      const isWeeks = daysUntilStr.includes('w');
      const totalDays = isWeeks ? days * 7 : days;
      
      if (totalDays <= 1) return '#ff4444'; // Red for today/tomorrow
      if (totalDays <= 3) return '#ff8800'; // Orange for 2-3 days
      if (totalDays <= 7) return '#ffaa00'; // Yellow-orange for 4-7 days
      return '#0a7ea4'; // Blue for more than a week
    };
    
    const daysUntilColor = getDaysUntilColor(daysUntil, isUpcoming);
    
    const rowId = item.id || `row-${item.appointmentDate}-${item.startTime}`;
    const isHovered = hoveredRow === rowId;
    
    return (
      <TouchableOpacity
        style={[
          styles.tableRow,
          {
            backgroundColor: isHovered 
              ? (isDark ? '#252525' : '#f5f5f5')
              : (isDark ? '#1a1a1a' : '#ffffff'),
            borderBottomColor: isDark ? '#2a2a2a' : '#f0f0f0',
          }
        ]}
        onPress={() => handleAppointmentPress(item)}
        activeOpacity={0.7}
        onMouseEnter={() => setHoveredRow(rowId)}
        onMouseLeave={() => setHoveredRow(null)}
      >
        <View style={styles.tableCellDate}>
          <ThemedText 
            style={[
              styles.tableCellDateText,
              isNext && { color: '#4CAF50', opacity: 1 }
            ]} 
            numberOfLines={1}
          >
            {formatDate(item.appointmentDate)}
          </ThemedText>
        </View>
        <View style={styles.tableCellDoctor}>
          <ThemedText style={styles.tableCellDoctorText} numberOfLines={1}>
            {item.specialistName || 'Unknown Doctor'}
          </ThemedText>
        </View>
        <View style={styles.tableCellSpecialty}>
          <ThemedText style={styles.tableCellSpecialtyText} numberOfLines={1}>
            {item.specialistSpecialty || '-'}
          </ThemedText>
        </View>
        <View style={styles.tableCellTime}>
          <ThemedText style={styles.tableCellTimeText}>
            {formatTime(item.startTime)}
          </ThemedText>
        </View>
        <View style={styles.tableCellStatus}>
          <ThemedText style={[styles.tableCellStatusText, { color: daysUntilColor }]}>
            {daysUntil || '-'}
          </ThemedText>
        </View>
        <View style={styles.tableCellArrow}>
          {isNext && (
            <ThemedText style={styles.nextLabelInline}>Next</ThemedText>
          )}
          <Octicons
            name="chevron-right"
            size={16}
            color={isNext ? '#4CAF50' : Colors[colorScheme ?? 'light'].text}
            style={styles.tableRowArrow}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: { type: 'appointment'; data: any } }) => {
    return renderAppointmentItem({ item: item.data });
  };

  // Check if we need to show table header (show once if there are any appointments)
  const shouldShowTableHeader = useMemo(() => {
    return listDataWithSections.some(item => item.type === 'appointment');
  }, [listDataWithSections]);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>No appointments found</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Your appointments will appear here
      </ThemedText>
    </View>
  );

  // Filter dropdown component
  const FilterDropdown = ({
    iconName,
    options,
    selectedValue,
    onSelect,
  }: {
    iconName: string;
    options: { value: string; label: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0, width: 0 });
    const buttonRef = useRef<View>(null);

    const selectedOption = options.find(opt => opt.value === selectedValue) || options[0];
    const isActive = selectedValue !== options[0].value;

    const handlePress = () => {
      if (buttonRef.current) {
        buttonRef.current.measureInWindow((x, y, width, height) => {
          setMenuPosition({
            x,
            y: y + height + 4,
            width,
          });
          setIsOpen(true);
        });
      } else {
        setIsOpen(true);
      }
    };

    const handleSelect = (value: T) => {
      onSelect(value);
      setIsOpen(false);
    };

    return (
      <View>
        <View ref={buttonRef} collapsable={false}>
          <TouchableOpacity
            onPress={handlePress}
            style={[
              styles.filterDropdownButton,
              isActive && styles.filterDropdownButtonActive,
            ]}
            activeOpacity={0.7}
          >
            <Octicons 
              name={iconName as any} 
              size={18} 
              color={isActive ? 'black' : '#666666'} 
              style={styles.filterIcon}
            />
            <ThemedText
              style={[
                styles.filterDropdownButtonText,
                isActive && styles.filterDropdownButtonTextActive,
              ]}
              lightColor={isActive ? 'black' : '#666666'}
              darkColor={isActive ? '#ECEDEE' : '#9BA1A6'}
            >
              {selectedOption.label}
            </ThemedText>
            <Octicons 
              name="chevron-down" 
              size={14} 
              color={isActive ? 'black' : '#666666'} 
              style={styles.filterChevronIcon}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={isOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <TouchableOpacity
            style={styles.filterModalOverlay}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          >
            <View
              style={[
                styles.filterDropdownMenu,
                {
                  position: 'absolute',
                  top: menuPosition.y > 0 ? menuPosition.y : undefined,
                  left: menuPosition.x > 0 ? menuPosition.x : undefined,
                  minWidth: menuPosition.width > 0 ? menuPosition.width : 140,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;
                const isLast = index === options.length - 1;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    style={[
                      styles.filterDropdownItem,
                      isSelected && styles.filterDropdownItemSelected,
                      isLast && styles.filterDropdownItemLast,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.filterDropdownItemText,
                        isSelected && styles.filterDropdownItemTextSelected,
                      ]}
                      lightColor={isSelected ? 'black' : '#666666'}
                      darkColor={isSelected ? '#ECEDEE' : '#9BA1A6'}
                    >
                      {option.label}
                    </ThemedText>
                    {isSelected && (
                      <Octicons 
                        name="check" 
                        size={14} 
                        color="black" 
                        style={styles.filterCheckIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  // Prepare filter options
  const monthOptions = useMemo(() => {
    const options: { value: MonthFilter; label: string }[] = [
      { value: 'all', label: 'All Months' },
      ...availableMonths.map(m => ({ value: m.value as MonthFilter, label: m.label })),
    ];
    return options;
  }, [availableMonths]);

  const dateOrderOptions: { value: DateOrderFilter; label: string }[] = [
    { value: 'upcoming-first', label: 'Upcoming First' },
    { value: 'newest-first', label: 'Newest First' },
    { value: 'oldest-first', label: 'Oldest First' },
  ];

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
      <ThemedView style={styles.filterBarContainer}>
        <View style={styles.filterBarSpacer} />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/get-care')}
          activeOpacity={0.7}
        >
          <Octicons name="plus" size={16} color={Colors[colorScheme ?? 'light'].text} />
          <ThemedText style={styles.addButtonText}>Add Appointment</ThemedText>
        </TouchableOpacity>
      </ThemedView>
      <View style={styles.tableContainer}>
        {shouldShowTableHeader && (
          <View style={styles.tableHeaderWrapper}>
            {renderTableHeader()}
          </View>
        )}
        <FlatList
          data={listDataWithSections}
          renderItem={renderItem}
          keyExtractor={(item, index) => {
            return item.data.id || `appointment-${item.data.appointmentDate}-${item.data.startTime}-${index}`;
          }}
          contentContainerStyle={[
            styles.listContent,
            listDataWithSections.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBarContainer: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBarSpacer: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 80, // Align with table right edge
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    minWidth: 140,
    gap: 8,
    minHeight: 38,
  },
  filterDropdownButtonActive: {
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
  },
  filterIcon: {
    alignSelf: 'center',
  },
  filterDropdownButtonText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
    textAlignVertical: 'center',
  },
  filterDropdownButtonTextActive: {
    fontWeight: '500',
  },
  filterChevronIcon: {
    alignSelf: 'center',
    marginLeft: 4,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  filterDropdownMenu: {
    backgroundColor: 'white',
    borderRadius: 3,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 40,
  },
  filterDropdownItemSelected: {
    backgroundColor: '#F5F5F5',
  },
  filterDropdownItemLast: {
    borderBottomWidth: 0,
  },
  filterDropdownItemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
    textAlignVertical: 'center',
  },
  filterDropdownItemTextSelected: {
    fontWeight: '500',
  },
  filterCheckIcon: {
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  sectionContainerFirst: {
    marginTop: 8,
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 12,
    width: 120,
  },
  sectionMonth: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
    marginRight: 6,
  },
  sectionYear: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.6,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  tableContainer: {
    marginTop: 48, // Match left tab bar vertical position - slightly adjusted up
    marginLeft: 40, // Cut from left side
  },
  tableHeaderWrapper: {
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flex: 1,
    marginRight: 60, // Cut off from right side
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 0,
  },
  headerDate: {
    width: 140,
    alignItems: 'flex-start',
  },
  headerDateText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  headerDoctor: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-start',
  },
  headerDoctorText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  headerSpecialty: {
    width: 100,
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  headerSpecialtyText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  headerTime: {
    width: 70,
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  headerTimeText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  headerStatus: {
    width: 70,
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  headerStatusText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  headerArrow: {
    width: 54, // 16px icon + 4px marginLeft + 4px marginRight + ~30px for "Next" label
    marginLeft: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
    minHeight: 40,
    flex: 1,
    marginRight: 60, // Cut off from right side
    marginTop: 0,
  },
  nextLabelInline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    marginRight: 2,
  },
  tableCellDate: {
    width: 140,
    alignItems: 'flex-start',
  },
  tableCellDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tableCellDoctor: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  tableCellDoctorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tableCellSpecialty: {
    width: 100,
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  tableCellSpecialtyText: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.6,
  },
  tableCellTime: {
    width: 70,
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  tableCellTimeText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  tableCellStatus: {
    width: 70,
    marginLeft: 8,
    alignItems: 'flex-start',
  },
  tableCellStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tableCellArrow: {
    width: 54,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tableRowArrow: {
    marginLeft: 2,
    opacity: 1,
    alignSelf: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.5,
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
});

