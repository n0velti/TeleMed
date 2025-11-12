import Octicons from '@expo/vector-icons/Octicons';
import * as ExpoLocation from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export type PriceFilter = 'all' | 'low' | 'medium' | 'high';
export type AvailabilityFilter = 'all' | 'today';
export type RatingFilter = 'all' | '4.5' | '4.7' | '4.9';

interface FilterBarProps {
  priceFilter: PriceFilter;
  availabilityFilter: AvailabilityFilter;
  ratingFilter: RatingFilter;
  locationFilter: string;
  onPriceFilterChange: (filter: PriceFilter) => void;
  onAvailabilityFilterChange: (filter: AvailabilityFilter) => void;
  onRatingFilterChange: (filter: RatingFilter) => void;
  onLocationFilterChange: (location: string) => void;
}

interface FilterDropdownProps<T extends string> {
  iconName: string;
  options: { value: T; label: string }[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

interface LocationFilterProps {
  location: string;
  onLocationChange: (value: string) => void;
}

function FilterDropdown<T extends string>({
  iconName,
  options,
  selectedValue,
  onSelect,
}: FilterDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
          {...(Platform.OS === 'web' ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          } : {})}
          style={[
            styles.dropdownButton,
            isActive && styles.activeDropdownButton,
            isHovered && styles.hoveredButton,
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
              styles.dropdownButtonText,
              isActive && styles.activeDropdownButtonText,
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
            style={styles.chevronIcon}
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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenu,
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
                    styles.dropdownItem,
                    isSelected && styles.dropdownItemSelected,
                    isLast && styles.dropdownItemLast,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.dropdownItemText,
                      isSelected && styles.dropdownItemTextSelected,
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
                      style={styles.checkIcon}
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
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    // Use OpenStreetMap Nominatim API for reverse geocoding (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TeleMed App', // Required by Nominatim
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }
    
    const data = await response.json();
    const address = data.address;
    
    // Try to get city name from various fields
    const cityName = 
      address.city || 
      address.town || 
      address.village || 
      address.municipality ||
      address.county ||
      address.state_district ||
      '';
    
    const region = address.state || address.region || '';
    
    // Return city name, or city + region, or fallback to coordinates
    if (cityName) {
      return region ? `${cityName}, ${region}` : cityName;
    }
    
    // Fallback to coordinates if we can't get city name
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Fallback to coordinates on error
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}

interface LocationSuggestion {
  display_name: string;
  place_id: number;
}

async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    // Use OpenStreetMap Nominatim API for forward geocoding/autocomplete
    const encodedQuery = encodeURIComponent(query.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=4&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'TeleMed App', // Required by Nominatim
        },
      }
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    // Return up to 4 suggestions
    return (data || []).slice(0, 4).map((item: any) => ({
      display_name: item.display_name,
      place_id: item.place_id,
    }));
  } catch (error) {
    console.error('Location search error:', error);
    return [];
  }
}

function LocationFilter({ location, onLocationChange }: LocationFilterProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('');
  const [hasCurrentLocation, setHasCurrentLocation] = useState(false);
  const [inputValue, setInputValue] = useState(location);
  const [isFetchingLocation, setIsFetchingLocation] = useState(true);
  const [isLocationUnavailable, setIsLocationUnavailable] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);
  const suggestionsRef = useRef<View>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch current location on mount using expo-location
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      try {
        setIsFetchingLocation(true);
        setIsLocationUnavailable(false);
        
        // Step 1: Check if location services are enabled (expo-location)
        const isEnabled = await ExpoLocation.hasServicesEnabledAsync();
        if (!isEnabled) {
          setIsLocationUnavailable(true);
          setIsFetchingLocation(false);
          return;
        }

        // Step 2: Request location permissions (expo-location)
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLocationUnavailable(true);
          setIsFetchingLocation(false);
          return;
        }

        // Step 3: Get current position coordinates (expo-location)
        const position = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
        
        // Step 4: Convert coordinates to city name using OpenStreetMap Nominatim API
        // Note: expo-location's reverseGeocodeAsync was removed in SDK 49,
        // so we use an external reverse geocoding service to get city names
        const cityName = await reverseGeocode(
          position.coords.latitude,
          position.coords.longitude
        );
        
        setCurrentLocation(cityName);
        setHasCurrentLocation(true);
        if (!location) {
          onLocationChange(cityName);
        }
        setIsLocationUnavailable(false);
      } catch (error) {
        console.error('Error fetching location:', error);
        setIsLocationUnavailable(true);
      } finally {
        setIsFetchingLocation(false);
      }
    };

    fetchCurrentLocation();
  }, []);

  // Update input value when location prop changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(location || currentLocation);
    }
  }, [location, currentLocation, isEditing]);

  // Debounced location search
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if not editing or input is too short
    if (!isEditing || !inputValue || inputValue.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
      return;
    }

    // Debounce the search by 300ms
    setIsLoadingSuggestions(true);
    setShowSuggestions(true);
    debounceTimerRef.current = setTimeout(async () => {
      const results = await searchLocations(inputValue);
      console.log('Location search results:', results);
      setSuggestions(results);
      setShowSuggestions(results.length > 0 || inputValue.trim().length >= 2);
      setIsLoadingSuggestions(false);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue, isEditing]);

  const handlePress = () => {
    setIsEditing(true);
    // Clear input so user can start typing fresh
    setInputValue('');
    // Position cursor at the start (left side)
    setSelection({ start: 0, end: 0 });
    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for suggestion clicks
    setTimeout(() => {
      setIsEditing(false);
      setShowSuggestions(false);
      const trimmed = inputValue.trim();
      if (trimmed) {
        onLocationChange(trimmed);
      } else if (currentLocation) {
        onLocationChange(currentLocation);
      }
    }, 200);
  };

  const handleSubmit = () => {
    setIsEditing(false);
    setShowSuggestions(false);
    const trimmed = inputValue.trim();
    if (trimmed) {
      onLocationChange(trimmed);
    } else if (currentLocation) {
      onLocationChange(currentLocation);
    }
    inputRef.current?.blur();
  };

  const handleSuggestionSelect = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.display_name);
    onLocationChange(suggestion.display_name);
    setShowSuggestions(false);
    setIsEditing(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    if (text.trim().length >= 2) {
      setShowSuggestions(true);
    }
  };

  const getDisplayText = () => {
    // If user has manually entered a location, show that
    if (location) {
      return location;
    }
    if (isFetchingLocation) {
      return 'Locating…';
    }
    if (isLocationUnavailable) {
      return 'Location unavailable';
    }
    if (currentLocation) {
      return currentLocation;
    }
    return 'Location';
  };

  const displayText = getDisplayText();
  const isActive = (location || currentLocation) && !isEditing && !isLocationUnavailable;

  if (isEditing) {
    return (
      <View style={styles.locationAutocompleteContainer}>
        <View style={[styles.dropdownButton, styles.locationInputContainer]}>
          <Octicons
            name="location"
            size={18}
            color="black"
            style={styles.filterIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.locationTextInput}
            value={inputValue}
            onChangeText={handleInputChange}
            placeholder={currentLocation || location || "Enter city or address"}
            placeholderTextColor="#9BA1A6"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            onBlur={handleBlur}
            textAlign="left"
            selection={selection}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            underlineColorAndroid="transparent"
          />
        </View>
        {(showSuggestions || isLoadingSuggestions) && inputValue.trim().length >= 2 && (
          <View ref={suggestionsRef} style={styles.suggestionsContainer}>
            {isLoadingSuggestions ? (
              <ThemedText
                style={styles.suggestionLoadingText}
                lightColor="#666666"
                darkColor="#9BA1A6"
              >
                Searching...
              </ThemedText>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion.place_id}
                  style={[
                    styles.suggestionItem,
                    index === suggestions.length - 1 && styles.suggestionItemLast,
                  ]}
                  onPress={() => handleSuggestionSelect(suggestion)}
                  activeOpacity={0.7}
                >
                  <Octicons
                    name="location"
                    size={14}
                    color="#666666"
                    style={styles.suggestionIcon}
                  />
                  <ThemedText
                    style={styles.suggestionText}
                    lightColor="#111111"
                    darkColor="#ECEDEE"
                    numberOfLines={1}
                  >
                    {suggestion.display_name}
                  </ThemedText>
                </TouchableOpacity>
              ))
            ) : null}
          </View>
        )}
      </View>
    );
  }

  const iconColor = isActive ? 'black' : '#666666';
  const textColor = isActive ? 'black' : '#666666';
  const textDarkColor = isActive ? '#ECEDEE' : '#9BA1A6';

  return (
    <TouchableOpacity
      onPress={handlePress}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      } : {})}
      style={[
        styles.dropdownButton,
        styles.locationButton,
        isHovered && styles.hoveredButton,
      ]}
      activeOpacity={0.7}
    >
      <Octicons
        name="location"
        size={18}
        color={iconColor}
        style={styles.filterIcon}
      />
      <ThemedText
        style={[
          styles.dropdownButtonText,
          isActive && styles.activeDropdownButtonText,
        ]}
        lightColor={textColor}
        darkColor={textDarkColor}
      >
        {displayText}
      </ThemedText>
    </TouchableOpacity>
  );
}

export function FilterBar({
  priceFilter,
  availabilityFilter,
  ratingFilter,
  locationFilter,
  onPriceFilterChange,
  onAvailabilityFilterChange,
  onRatingFilterChange,
  onLocationFilterChange,
}: FilterBarProps) {
  const priceOptions: { value: PriceFilter; label: string }[] = [
    { value: 'all', label: 'All Prices' },
    { value: 'low', label: '$ (<$100)' },
    { value: 'medium', label: '$$ ($100-140)' },
    { value: 'high', label: '$$$ ($140+)' },
  ];

  const availabilityOptions: { value: AvailabilityFilter; label: string }[] = [
    { value: 'all', label: 'All Times' },
    { value: 'today', label: 'Available Today' },
  ];

  const ratingOptions: { value: RatingFilter; label: string }[] = [
    { value: 'all', label: 'All Ratings' },
    { value: '4.5', label: '4.5+ ⭐' },
    { value: '4.7', label: '4.7+ ⭐' },
    { value: '4.9', label: '4.9+ ⭐' },
  ];

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filterRow}>
        <View style={styles.leftSection}>
          <LocationFilter
            location={locationFilter}
            onLocationChange={onLocationFilterChange}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rightSection}
          style={styles.scrollView}
        >
          <FilterDropdown
            iconName="credit-card"
            options={priceOptions}
            selectedValue={priceFilter}
            onSelect={onPriceFilterChange}
          />

          <FilterDropdown
            iconName="clock"
            options={availabilityOptions}
            selectedValue={availabilityFilter}
            onSelect={onAvailabilityFilterChange}
          />

          <FilterDropdown
            iconName="star"
            options={ratingOptions}
            selectedValue={ratingFilter}
            onSelect={onRatingFilterChange}
          />
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftSection: {
    flexShrink: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 16,
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  dropdownButton: {
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
  locationButton: {
    minWidth: 200,
    backgroundColor: 'transparent',
  },
  locationInputContainer: {
    minWidth: 200,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#111111',
    padding: 0,
    margin: 0,
    outline: 'none',
    outlineWidth: 0,
    borderWidth: 0,
  },
  locationAutocompleteContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
    overflow: 'hidden',
    zIndex: 1001,
    minWidth: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    alignSelf: 'center',
  },
  suggestionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
  },
  suggestionLoadingText: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: 'center',
  },
  activeDropdownButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
  },
  hoveredButton: {
    backgroundColor: '#F8F8F8',
    borderRadius: 3,
  },
  filterIcon: {
    alignSelf: 'center',
  },
  dropdownButtonText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
    textAlignVertical: 'center',
  },
  activeDropdownButtonText: {
    fontWeight: '500',
  },
  chevronIcon: {
    alignSelf: 'center',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  dropdownMenu: {
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
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 40,
  },
  dropdownItemSelected: {
    backgroundColor: '#F5F5F5',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
    textAlignVertical: 'center',
  },
  dropdownItemTextSelected: {
    fontWeight: '500',
  },
  checkIcon: {
    alignSelf: 'center',
  },
});

