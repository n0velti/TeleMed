import Octicons from '@expo/vector-icons/Octicons';
import React, { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export type PriceFilter = 'all' | 'low' | 'medium' | 'high';
export type AvailabilityFilter = 'all' | 'today';
export type RatingFilter = 'all' | '4.5' | '4.7' | '4.9';

interface FilterBarProps {
  priceFilter: PriceFilter;
  availabilityFilter: AvailabilityFilter;
  ratingFilter: RatingFilter;
  onPriceFilterChange: (filter: PriceFilter) => void;
  onAvailabilityFilterChange: (filter: AvailabilityFilter) => void;
  onRatingFilterChange: (filter: RatingFilter) => void;
}

interface FilterDropdownProps<T extends string> {
  iconName: string;
  options: { value: T; label: string }[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

function FilterDropdown<T extends string>({
  iconName,
  options,
  selectedValue,
  onSelect,
}: FilterDropdownProps<T>) {
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
            styles.dropdownButton,
            isActive && styles.activeDropdownButton,
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

export function FilterBar({
  priceFilter,
  availabilityFilter,
  ratingFilter,
  onPriceFilterChange,
  onAvailabilityFilterChange,
  onRatingFilterChange,
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 12,
    paddingRight: 16,
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
  activeDropdownButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
  },
  filterIcon: {
    alignSelf: 'center',
  },
  dropdownButtonText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
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

