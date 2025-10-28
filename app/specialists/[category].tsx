import { SearchBar } from '@/components/search-bar';
import { SpecialistCard } from '@/components/specialist-card';
import { StaticSidebar } from '@/components/static-sidebar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  price: number;
  image?: string;
}

// Mock data for specialists
const mockSpecialists: Record<string, Specialist[]> = {
  'General Practitioner': [
    { id: '1', name: 'Dr. Sarah Johnson', specialty: 'General Practice', rating: 4.8, experience: '8 years', price: 75 },
    { id: '2', name: 'Dr. Michael Chen', specialty: 'Family Medicine', rating: 4.9, experience: '12 years', price: 85 },
    { id: '3', name: 'Dr. Emily Rodriguez', specialty: 'Internal Medicine', rating: 4.7, experience: '6 years', price: 70 },
    { id: '4', name: 'Dr. David Thompson', specialty: 'General Practice', rating: 4.6, experience: '10 years', price: 80 },
    { id: '5', name: 'Dr. Lisa Anderson', specialty: 'Family Medicine', rating: 4.8, experience: '9 years', price: 75 },
    { id: '6', name: 'Dr. Robert Martinez', specialty: 'Internal Medicine', rating: 4.9, experience: '14 years', price: 90 },
    { id: '7', name: 'Dr. Jennifer White', specialty: 'General Practice', rating: 4.7, experience: '7 years', price: 70 },
    { id: '8', name: 'Dr. Christopher Lee', specialty: 'Family Medicine', rating: 4.8, experience: '11 years', price: 85 },
  ],
  'Dermatologist': [
    { id: '9', name: 'Dr. Lisa Wang', specialty: 'Dermatology', rating: 4.9, experience: '15 years', price: 120 },
    { id: '10', name: 'Dr. James Wilson', specialty: 'Dermatology', rating: 4.8, experience: '11 years', price: 110 },
    { id: '11', name: 'Dr. Maria Garcia', specialty: 'Dermatology', rating: 4.7, experience: '9 years', price: 100 },
    { id: '12', name: 'Dr. Robert Kim', specialty: 'Dermatology', rating: 4.9, experience: '13 years', price: 115 },
    { id: '13', name: 'Dr. Amanda Taylor', specialty: 'Dermatology', rating: 4.8, experience: '10 years', price: 105 },
    { id: '14', name: 'Dr. Daniel Brown', specialty: 'Dermatology', rating: 4.7, experience: '8 years', price: 95 },
    { id: '15', name: 'Dr. Nicole Davis', specialty: 'Dermatology', rating: 4.9, experience: '16 years', price: 125 },
    { id: '16', name: 'Dr. Kevin Johnson', specialty: 'Dermatology', rating: 4.6, experience: '6 years', price: 90 },
  ],
  'Cardiologist': [
    { id: '17', name: 'Dr. Jennifer Lee', specialty: 'Cardiology', rating: 4.9, experience: '18 years', price: 150 },
    { id: '18', name: 'Dr. Thomas Brown', specialty: 'Cardiology', rating: 4.8, experience: '14 years', price: 140 },
    { id: '19', name: 'Dr. Amanda Davis', specialty: 'Cardiology', rating: 4.7, experience: '7 years', price: 120 },
    { id: '20', name: 'Dr. Christopher Taylor', specialty: 'Cardiology', rating: 4.9, experience: '16 years', price: 145 },
    { id: '21', name: 'Dr. Rachel Green', specialty: 'Cardiology', rating: 4.8, experience: '12 years', price: 135 },
    { id: '22', name: 'Dr. Mark Wilson', specialty: 'Cardiology', rating: 4.7, experience: '9 years', price: 125 },
    { id: '23', name: 'Dr. Susan Martinez', specialty: 'Cardiology', rating: 4.9, experience: '15 years', price: 145 },
    { id: '24', name: 'Dr. Matthew Anderson', specialty: 'Cardiology', rating: 4.8, experience: '11 years', price: 130 },
  ],
  'Psychiatrist': [
    { id: '25', name: 'Dr. Rachel Green', specialty: 'Psychiatry', rating: 4.8, experience: '12 years', price: 130 },
    { id: '26', name: 'Dr. Mark Anderson', specialty: 'Psychiatry', rating: 4.7, experience: '9 years', price: 115 },
    { id: '27', name: 'Dr. Nicole Martinez', specialty: 'Psychiatry', rating: 4.9, experience: '11 years', price: 125 },
    { id: '28', name: 'Dr. Kevin White', specialty: 'Psychiatry', rating: 4.6, experience: '8 years', price: 110 },
    { id: '29', name: 'Dr. Lisa Thompson', specialty: 'Psychiatry', rating: 4.8, experience: '13 years', price: 135 },
    { id: '30', name: 'Dr. David Kim', specialty: 'Psychiatry', rating: 4.7, experience: '10 years', price: 120 },
    { id: '31', name: 'Dr. Emily Chen', specialty: 'Psychiatry', rating: 4.9, experience: '14 years', price: 140 },
    { id: '32', name: 'Dr. Michael Rodriguez', specialty: 'Psychiatry', rating: 4.6, experience: '7 years', price: 105 },
  ],
  'Pediatrician': [
    { id: '33', name: 'Dr. Susan Clark', specialty: 'Pediatrics', rating: 4.9, experience: '13 years', price: 95 },
    { id: '34', name: 'Dr. Daniel Lewis', specialty: 'Pediatrics', rating: 4.8, experience: '10 years', price: 85 },
    { id: '35', name: 'Dr. Jessica Turner', specialty: 'Pediatrics', rating: 4.7, experience: '7 years', price: 75 },
    { id: '36', name: 'Dr. Matthew Hall', specialty: 'Pediatrics', rating: 4.9, experience: '15 years', price: 100 },
    { id: '37', name: 'Dr. Sarah Wilson', specialty: 'Pediatrics', rating: 4.8, experience: '12 years', price: 90 },
    { id: '38', name: 'Dr. Robert Garcia', specialty: 'Pediatrics', rating: 4.7, experience: '9 years', price: 80 },
    { id: '39', name: 'Dr. Jennifer Brown', specialty: 'Pediatrics', rating: 4.9, experience: '16 years', price: 105 },
    { id: '40', name: 'Dr. Christopher Davis', specialty: 'Pediatrics', rating: 4.8, experience: '11 years', price: 85 },
  ],
  'Orthopedist': [
    { id: '41', name: 'Dr. Michael Johnson', specialty: 'Orthopedics', rating: 4.9, experience: '17 years', price: 155 },
    { id: '42', name: 'Dr. Lisa Williams', specialty: 'Orthopedics', rating: 4.8, experience: '13 years', price: 140 },
    { id: '43', name: 'Dr. David Miller', specialty: 'Orthopedics', rating: 4.7, experience: '10 years', price: 125 },
    { id: '44', name: 'Dr. Sarah Wilson', specialty: 'Orthopedics', rating: 4.9, experience: '15 years', price: 150 },
    { id: '45', name: 'Dr. Robert Moore', specialty: 'Orthopedics', rating: 4.8, experience: '12 years', price: 135 },
    { id: '46', name: 'Dr. Jennifer Taylor', specialty: 'Orthopedics', rating: 4.7, experience: '8 years', price: 120 },
    { id: '47', name: 'Dr. Christopher Anderson', specialty: 'Orthopedics', rating: 4.9, experience: '14 years', price: 145 },
    { id: '48', name: 'Dr. Amanda Thomas', specialty: 'Orthopedics', rating: 4.8, experience: '11 years', price: 130 },
  ],
  'Neurologist': [
    { id: '49', name: 'Dr. Rachel Jackson', specialty: 'Neurology', rating: 4.9, experience: '16 years', price: 160 },
    { id: '50', name: 'Dr. Mark White', specialty: 'Neurology', rating: 4.8, experience: '12 years', price: 145 },
    { id: '51', name: 'Dr. Nicole Harris', specialty: 'Neurology', rating: 4.7, experience: '9 years', price: 130 },
    { id: '52', name: 'Dr. Kevin Martin', specialty: 'Neurology', rating: 4.9, experience: '15 years', price: 155 },
    { id: '53', name: 'Dr. Lisa Thompson', specialty: 'Neurology', rating: 4.8, experience: '13 years', price: 150 },
    { id: '54', name: 'Dr. David Garcia', specialty: 'Neurology', rating: 4.7, experience: '10 years', price: 135 },
    { id: '55', name: 'Dr. Emily Rodriguez', specialty: 'Neurology', rating: 4.9, experience: '14 years', price: 155 },
    { id: '56', name: 'Dr. Michael Chen', specialty: 'Neurology', rating: 4.8, experience: '11 years', price: 140 },
  ],
};

export default function SpecialistCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const specialists = mockSpecialists[category] || [];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      Alert.alert('Search', `Searching for: ${query} in ${category}`);
    }
  };

  const handleSpecialistPress = (specialist: Specialist) => {
    router.push(`/specialist/${specialist.id}`);
  };

  const renderSpecialist = ({ item }: { item: Specialist }) => (
    <SpecialistCard
      {...item}
      onPress={() => handleSpecialistPress(item)}
    />
  );

  return (
    <View style={styles.wrapper}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
        }} 
      />
      <StaticSidebar />
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <SearchBar onSearch={handleSearch} />
          <ThemedText style={styles.resultCount}>
            {specialists.length} {specialists.length === 1 ? 'specialist' : 'specialists'} available
          </ThemedText>
        </ThemedView>
        
        <FlatList
          data={specialists}
          renderItem={renderSpecialist}
          keyExtractor={(item) => item.id}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <ThemedView style={styles.separator} />}
        />
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
  header: {
    paddingTop: 8,
  },
  resultCount: {
    fontSize: 14,
    opacity: 0.6,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  separator: {
    height: 16,
  },
});

