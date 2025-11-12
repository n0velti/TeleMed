import type { Schema } from '@/amplify/data/resource';
import { FilterBar } from '@/components/filter-bar';
import { SpecialistSection } from '@/components/specialist-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { generateClient } from 'aws-amplify/data';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

const client = generateClient<Schema>();

import type { PopularityBadgeType, SocialProofType } from '@/components/specialist-card';

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  price: number;
  image?: string;
  nextAvailableTime?: string;
  socialProof?: {
    type: SocialProofType;
    value?: string | number;
  };
  popularityBadge?: PopularityBadgeType;
}

// Mock data for specialists
const mockSpecialists: { [key: string]: Specialist[] } = {
  'General Practitioner': [
    { id: '1', name: 'Dr. Sarah Johnson', specialty: 'General Practice', rating: 4.8, experience: '8 years', price: 75, nextAvailableTime: 'Today 2:00 PM', socialProof: { type: 'review_count', value: 342 }, popularityBadge: 'popular' },
    { id: '2', name: 'Dr. Michael Chen', specialty: 'Family Medicine', rating: 4.9, experience: '12 years', price: 85, nextAvailableTime: 'Today 3:30 PM', socialProof: { type: 'patient_count', value: 2300 }, popularityBadge: 'most_booked' },
    { id: '3', name: 'Dr. Emily Rodriguez', specialty: 'Internal Medicine', rating: 4.7, experience: '6 years', price: 70, nextAvailableTime: 'Tomorrow 10:00 AM', socialProof: { type: 'return_rate', value: 95 }, popularityBadge: 'top_rated' },
    { id: '4', name: 'Dr. David Thompson', specialty: 'General Practice', rating: 4.6, experience: '10 years', price: 80, nextAvailableTime: 'Today 4:15 PM', socialProof: { type: 'response_time', value: '2h' }, popularityBadge: 'featured' },
    { id: '5', name: 'Dr. Lisa Anderson', specialty: 'Family Medicine', rating: 4.8, experience: '9 years', price: 75, nextAvailableTime: 'Tomorrow 9:00 AM', socialProof: { type: 'verified' }, popularityBadge: 'new' },
    { id: '6', name: 'Dr. Robert Martinez', specialty: 'Internal Medicine', rating: 4.9, experience: '14 years', price: 90, nextAvailableTime: 'Today 5:00 PM', socialProof: { type: 'review_count', value: 521 }, popularityBadge: 'popular' },
    { id: '7', name: 'Dr. Jennifer White', specialty: 'General Practice', rating: 4.7, experience: '7 years', price: 70, nextAvailableTime: 'Tomorrow 11:30 AM', socialProof: { type: 'patient_count', value: 1800 }, popularityBadge: 'most_booked' },
    { id: '8', name: 'Dr. Christopher Lee', specialty: 'Family Medicine', rating: 4.8, experience: '11 years', price: 85, nextAvailableTime: 'Today 1:00 PM', socialProof: { type: 'return_rate', value: 92 }, popularityBadge: 'top_rated' },
  ],
  'Dermatologist': [
    { id: '9', name: 'Dr. Lisa Wang', specialty: 'Dermatology', rating: 4.9, experience: '15 years', price: 120, nextAvailableTime: 'Today 2:30 PM', socialProof: { type: 'review_count', value: 678 }, popularityBadge: 'featured' },
    { id: '10', name: 'Dr. James Wilson', specialty: 'Dermatology', rating: 4.8, experience: '11 years', price: 110, nextAvailableTime: 'Tomorrow 1:00 PM', socialProof: { type: 'patient_count', value: 3100 }, popularityBadge: 'popular' },
    { id: '11', name: 'Dr. Maria Garcia', specialty: 'Dermatology', rating: 4.7, experience: '9 years', price: 100, nextAvailableTime: 'Today 3:00 PM', socialProof: { type: 'response_time', value: '1h' }, popularityBadge: 'new' },
    { id: '12', name: 'Dr. Robert Kim', specialty: 'Dermatology', rating: 4.9, experience: '13 years', price: 115, nextAvailableTime: 'Tomorrow 10:30 AM', socialProof: { type: 'return_rate', value: 97 }, popularityBadge: 'top_rated' },
    { id: '13', name: 'Dr. Amanda Taylor', specialty: 'Dermatology', rating: 4.8, experience: '10 years', price: 105, nextAvailableTime: 'Today 4:00 PM', socialProof: { type: 'verified' }, popularityBadge: 'most_booked' },
    { id: '14', name: 'Dr. Daniel Brown', specialty: 'Dermatology', rating: 4.7, experience: '8 years', price: 95, nextAvailableTime: 'Tomorrow 2:00 PM', socialProof: { type: 'review_count', value: 245 }, popularityBadge: 'popular' },
    { id: '15', name: 'Dr. Nicole Davis', specialty: 'Dermatology', rating: 4.9, experience: '16 years', price: 125, nextAvailableTime: 'Today 5:30 PM', socialProof: { type: 'patient_count', value: 4200 }, popularityBadge: 'featured' },
    { id: '16', name: 'Dr. Kevin Johnson', specialty: 'Dermatology', rating: 4.6, experience: '6 years', price: 90, nextAvailableTime: 'Tomorrow 9:30 AM', socialProof: { type: 'return_rate', value: 88 }, popularityBadge: 'new' },
  ],
  'Cardiologist': [
    { id: '17', name: 'Dr. Jennifer Lee', specialty: 'Cardiology', rating: 4.9, experience: '18 years', price: 150, nextAvailableTime: 'Tomorrow 8:00 AM', socialProof: { type: 'review_count', value: 892 }, popularityBadge: 'top_rated' },
    { id: '18', name: 'Dr. Thomas Brown', specialty: 'Cardiology', rating: 4.8, experience: '14 years', price: 140, nextAvailableTime: 'Today 3:00 PM', socialProof: { type: 'patient_count', value: 5100 }, popularityBadge: 'featured' },
    { id: '19', name: 'Dr. Amanda Davis', specialty: 'Cardiology', rating: 4.7, experience: '7 years', price: 120, nextAvailableTime: 'Tomorrow 11:00 AM', socialProof: { type: 'verified' }, popularityBadge: 'new' },
    { id: '20', name: 'Dr. Christopher Taylor', specialty: 'Cardiology', rating: 4.9, experience: '16 years', price: 145, nextAvailableTime: 'Today 4:30 PM', socialProof: { type: 'return_rate', value: 96 }, popularityBadge: 'most_booked' },
    { id: '21', name: 'Dr. Rachel Green', specialty: 'Cardiology', rating: 4.8, experience: '12 years', price: 135, nextAvailableTime: 'Tomorrow 1:30 PM', socialProof: { type: 'response_time', value: '3h' }, popularityBadge: 'popular' },
    { id: '22', name: 'Dr. Mark Wilson', specialty: 'Cardiology', rating: 4.7, experience: '9 years', price: 125, nextAvailableTime: 'Today 2:00 PM', socialProof: { type: 'review_count', value: 456 }, popularityBadge: 'top_rated' },
    { id: '23', name: 'Dr. Susan Martinez', specialty: 'Cardiology', rating: 4.9, experience: '15 years', price: 145, nextAvailableTime: 'Tomorrow 9:30 AM', socialProof: { type: 'patient_count', value: 3800 }, popularityBadge: 'featured' },
    { id: '24', name: 'Dr. Matthew Anderson', specialty: 'Cardiology', rating: 4.8, experience: '11 years', price: 130, nextAvailableTime: 'Today 5:15 PM', socialProof: { type: 'return_rate', value: 93 }, popularityBadge: 'popular' },
  ],
  'Psychiatrist': [
    { id: '25', name: 'Dr. Rachel Green', specialty: 'Psychiatry', rating: 4.8, experience: '12 years', price: 130, nextAvailableTime: 'Today 1:30 PM', socialProof: { type: 'review_count', value: 567 }, popularityBadge: 'top_rated' },
    { id: '26', name: 'Dr. Mark Anderson', specialty: 'Psychiatry', rating: 4.7, experience: '9 years', price: 115, nextAvailableTime: 'Tomorrow 10:00 AM', socialProof: { type: 'response_time', value: '1h' }, popularityBadge: 'popular' },
    { id: '27', name: 'Dr. Nicole Martinez', specialty: 'Psychiatry', rating: 4.9, experience: '11 years', price: 125, nextAvailableTime: 'Today 3:30 PM', socialProof: { type: 'patient_count', value: 2900 }, popularityBadge: 'featured' },
    { id: '28', name: 'Dr. Kevin White', specialty: 'Psychiatry', rating: 4.6, experience: '8 years', price: 110, nextAvailableTime: 'Tomorrow 2:30 PM', socialProof: { type: 'verified' }, popularityBadge: 'new' },
    { id: '29', name: 'Dr. Lisa Thompson', specialty: 'Psychiatry', rating: 4.8, experience: '13 years', price: 135, nextAvailableTime: 'Today 4:45 PM', socialProof: { type: 'return_rate', value: 94 }, popularityBadge: 'most_booked' },
    { id: '30', name: 'Dr. David Kim', specialty: 'Psychiatry', rating: 4.7, experience: '10 years', price: 120, nextAvailableTime: 'Tomorrow 9:00 AM', socialProof: { type: 'review_count', value: 389 }, popularityBadge: 'popular' },
    { id: '31', name: 'Dr. Emily Chen', specialty: 'Psychiatry', rating: 4.9, experience: '14 years', price: 140, nextAvailableTime: 'Today 2:15 PM', socialProof: { type: 'patient_count', value: 3600 }, popularityBadge: 'top_rated' },
    { id: '32', name: 'Dr. Michael Rodriguez', specialty: 'Psychiatry', rating: 4.6, experience: '7 years', price: 105, nextAvailableTime: 'Tomorrow 11:30 AM', socialProof: { type: 'response_time', value: '2h' }, popularityBadge: 'new' },
  ],
  'Pediatrician': [
    { id: '33', name: 'Dr. Susan Clark', specialty: 'Pediatrics', rating: 4.9, experience: '13 years', price: 95, nextAvailableTime: 'Today 10:00 AM', socialProof: { type: 'review_count', value: 723 }, popularityBadge: 'featured' },
    { id: '34', name: 'Dr. Daniel Lewis', specialty: 'Pediatrics', rating: 4.8, experience: '10 years', price: 85, nextAvailableTime: 'Tomorrow 8:30 AM', socialProof: { type: 'patient_count', value: 4100 }, popularityBadge: 'popular' },
    { id: '35', name: 'Dr. Jessica Turner', specialty: 'Pediatrics', rating: 4.7, experience: '7 years', price: 75, nextAvailableTime: 'Today 1:45 PM', socialProof: { type: 'verified' }, popularityBadge: 'new' },
    { id: '36', name: 'Dr. Matthew Hall', specialty: 'Pediatrics', rating: 4.9, experience: '15 years', price: 100, nextAvailableTime: 'Tomorrow 3:00 PM', socialProof: { type: 'return_rate', value: 98 }, popularityBadge: 'top_rated' },
    { id: '37', name: 'Dr. Sarah Wilson', specialty: 'Pediatrics', rating: 4.8, experience: '12 years', price: 90, nextAvailableTime: 'Today 2:30 PM', socialProof: { type: 'response_time', value: '1h' }, popularityBadge: 'most_booked' },
    { id: '38', name: 'Dr. Robert Garcia', specialty: 'Pediatrics', rating: 4.7, experience: '9 years', price: 80, nextAvailableTime: 'Tomorrow 10:15 AM', socialProof: { type: 'review_count', value: 412 }, popularityBadge: 'popular' },
    { id: '39', name: 'Dr. Jennifer Brown', specialty: 'Pediatrics', rating: 4.9, experience: '16 years', price: 105, nextAvailableTime: 'Today 4:00 PM', socialProof: { type: 'patient_count', value: 4800 }, popularityBadge: 'featured' },
    { id: '40', name: 'Dr. Christopher Davis', specialty: 'Pediatrics', rating: 4.8, experience: '11 years', price: 85, nextAvailableTime: 'Tomorrow 1:15 PM', socialProof: { type: 'return_rate', value: 96 }, popularityBadge: 'top_rated' },
  ],
  'Orthopedist': [
    { id: '41', name: 'Dr. Michael Johnson', specialty: 'Orthopedics', rating: 4.9, experience: '17 years', price: 155, nextAvailableTime: 'Tomorrow 8:00 AM', socialProof: { type: 'review_count', value: 934 }, popularityBadge: 'top_rated' },
    { id: '42', name: 'Dr. Lisa Williams', specialty: 'Orthopedics', rating: 4.8, experience: '13 years', price: 140, nextAvailableTime: 'Today 3:15 PM', socialProof: { type: 'patient_count', value: 5500 }, popularityBadge: 'featured' },
    { id: '43', name: 'Dr. David Miller', specialty: 'Orthopedics', rating: 4.7, experience: '10 years', price: 125, nextAvailableTime: 'Tomorrow 11:45 AM', socialProof: { type: 'verified' }, popularityBadge: 'popular' },
    { id: '44', name: 'Dr. Sarah Wilson', specialty: 'Orthopedics', rating: 4.9, experience: '15 years', price: 150, nextAvailableTime: 'Today 1:30 PM', socialProof: { type: 'return_rate', value: 97 }, popularityBadge: 'most_booked' },
    { id: '45', name: 'Dr. Robert Moore', specialty: 'Orthopedics', rating: 4.8, experience: '12 years', price: 135, nextAvailableTime: 'Tomorrow 2:00 PM', socialProof: { type: 'response_time', value: '2h' }, popularityBadge: 'popular' },
    { id: '46', name: 'Dr. Jennifer Taylor', specialty: 'Orthopedics', rating: 4.7, experience: '8 years', price: 120, nextAvailableTime: 'Today 4:30 PM', socialProof: { type: 'review_count', value: 298 }, popularityBadge: 'new' },
    { id: '47', name: 'Dr. Christopher Anderson', specialty: 'Orthopedics', rating: 4.9, experience: '14 years', price: 145, nextAvailableTime: 'Tomorrow 10:00 AM', socialProof: { type: 'patient_count', value: 4700 }, popularityBadge: 'featured' },
    { id: '48', name: 'Dr. Amanda Thomas', specialty: 'Orthopedics', rating: 4.8, experience: '11 years', price: 130, nextAvailableTime: 'Today 5:00 PM', socialProof: { type: 'return_rate', value: 95 }, popularityBadge: 'top_rated' },
  ],
  'Neurologist': [
    { id: '49', name: 'Dr. Rachel Jackson', specialty: 'Neurology', rating: 4.9, experience: '16 years', price: 160, nextAvailableTime: 'Tomorrow 9:00 AM', socialProof: { type: 'review_count', value: 1056 }, popularityBadge: 'featured' },
    { id: '50', name: 'Dr. Mark White', specialty: 'Neurology', rating: 4.8, experience: '12 years', price: 145, nextAvailableTime: 'Today 2:45 PM', socialProof: { type: 'patient_count', value: 6200 }, popularityBadge: 'top_rated' },
    { id: '51', name: 'Dr. Nicole Harris', specialty: 'Neurology', rating: 4.7, experience: '9 years', price: 130, nextAvailableTime: 'Tomorrow 1:00 PM', socialProof: { type: 'verified' }, popularityBadge: 'popular' },
    { id: '52', name: 'Dr. Kevin Martin', specialty: 'Neurology', rating: 4.9, experience: '15 years', price: 155, nextAvailableTime: 'Today 3:45 PM', socialProof: { type: 'return_rate', value: 98 }, popularityBadge: 'most_booked' },
    { id: '53', name: 'Dr. Lisa Thompson', specialty: 'Neurology', rating: 4.8, experience: '13 years', price: 150, nextAvailableTime: 'Tomorrow 11:00 AM', socialProof: { type: 'response_time', value: '1h' }, popularityBadge: 'popular' },
    { id: '54', name: 'Dr. David Garcia', specialty: 'Neurology', rating: 4.7, experience: '10 years', price: 135, nextAvailableTime: 'Today 4:15 PM', socialProof: { type: 'review_count', value: 587 }, popularityBadge: 'new' },
    { id: '55', name: 'Dr. Emily Rodriguez', specialty: 'Neurology', rating: 4.9, experience: '14 years', price: 155, nextAvailableTime: 'Tomorrow 2:30 PM', socialProof: { type: 'patient_count', value: 5900 }, popularityBadge: 'featured' },
    { id: '56', name: 'Dr. Michael Chen', specialty: 'Neurology', rating: 4.8, experience: '11 years', price: 140, nextAvailableTime: 'Today 5:30 PM', socialProof: { type: 'return_rate', value: 96 }, popularityBadge: 'top_rated' },
  ],
};

export default function HomeScreen() {
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'today'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | '4.5' | '4.7' | '4.9'>('all');
  const [familyMedicineSpecialists, setFamilyMedicineSpecialists] = useState<Specialist[]>([]);
  const [locationFilter, setLocationFilter] = useState('');
  const [isLoadingFamilyMedicine, setIsLoadingFamilyMedicine] = useState(false);

  // Fetch Family Medicine specialists from database
  useEffect(() => {
    const fetchFamilyMedicineSpecialists = async () => {
      setIsLoadingFamilyMedicine(true);
      try {
        console.log('[Family Medicine] Starting fetch...');
        
        // First, find the "Family Medicine" specialization
        const specializations = await client.models.Specialization.list();
        console.log('[Family Medicine] All specializations:', specializations.data);
        
        const familyMedicineSpec = specializations.data.find(
          spec => spec.name === 'Family Medicine' || spec.name?.toLowerCase().includes('family medicine')
        );

        if (!familyMedicineSpec) {
          console.log('[Family Medicine] Family Medicine specialization not found');
          console.log('[Family Medicine] Available specializations:', specializations.data.map(s => s.name));
          setIsLoadingFamilyMedicine(false);
          return;
        }

        const familyMedicineId = familyMedicineSpec.id;
        console.log('[Family Medicine] Found specialization ID:', familyMedicineId);

        // Find all specialist-specialization relationships for Family Medicine
        const specialistSpecializations = await client.models.SpecialistSpecialization.list();
        console.log('[Family Medicine] All specialist-specializations:', specialistSpecializations.data);
        
        const familyMedicineRelations = specialistSpecializations.data.filter(
          ss => ss.specialization_id === familyMedicineId
        );
        console.log('[Family Medicine] Family Medicine relations:', familyMedicineRelations);

        if (familyMedicineRelations.length === 0) {
          console.log('[Family Medicine] WARNING: No SpecialistSpecialization relationships found for Family Medicine');
          console.log('[Family Medicine] This means no specialists have been linked to Family Medicine specialization yet');
          console.log('[Family Medicine] To fix: Register a specialist and select Family Medicine as their specialization');
          // Don't return early - let it continue so we can set empty array and show the section
        }

        // Fetch all specialists
        const allSpecialists = await client.models.Specialist.list();
        console.log('[Family Medicine] All specialists:', allSpecialists.data);
        
        // Get specialist IDs from relationships
        const specialistIds = familyMedicineRelations.map(ss => ss.specialist_id);
        console.log('[Family Medicine] Specialist IDs:', specialistIds);

        // Filter specialists that have Family Medicine specialization
        // Show all specialists with Family Medicine, regardless of status (for now)
        const familyMedicineDocs = allSpecialists.data
          .filter(specialist => {
            const hasSpecialization = specialistIds.includes(specialist.id);
            console.log(`[Family Medicine] Specialist ${specialist.id} (${specialist.first_name} ${specialist.last_name}): hasSpecialization=${hasSpecialization}, status=${specialist.status}`);
            
            // For debugging: show all specialists with Family Medicine, even if not active
            // Later we can filter by status === 'active' if needed
            return hasSpecialization;
          })
          .map(specialist => ({
            id: specialist.id,
            name: `Dr. ${specialist.first_name} ${specialist.last_name}`,
            specialty: 'Family Medicine',
            rating: 4.5, // Default rating - can be enhanced later
            experience: '10 years', // Default experience - can be enhanced later
            price: 85, // Default price - can be enhanced later
            image: specialist.photo_url || undefined,
            nextAvailableTime: 'Today 2:00 PM', // Default - can be enhanced later
            socialProof: { type: 'review_count' as SocialProofType, value: 150 }, // Default - can be enhanced later
            popularityBadge: 'popular' as PopularityBadgeType, // Default - can be enhanced later
          }));
        
        // Log detailed info for debugging
        if (familyMedicineDocs.length === 0) {
          console.log('[Family Medicine] No specialists found. Debugging info:');
          console.log('[Family Medicine] - Specialization ID:', familyMedicineId);
          console.log('[Family Medicine] - Specialist IDs from relationships:', specialistIds);
          console.log('[Family Medicine] - All specialist IDs in DB:', allSpecialists.data.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, status: s.status })));
          console.log('[Family Medicine] - Family Medicine relations:', familyMedicineRelations);
        }

        console.log('[Family Medicine] Final family medicine docs:', familyMedicineDocs);
        setFamilyMedicineSpecialists(familyMedicineDocs);
      } catch (error) {
        console.error('[Family Medicine] Error fetching Family Medicine specialists:', error);
        console.error('[Family Medicine] Error details:', JSON.stringify(error, null, 2));
      } finally {
        setIsLoadingFamilyMedicine(false);
      }
    };

    fetchFamilyMedicineSpecialists();
  }, []);

  const handleSpecialistPress = (specialist: Specialist) => {
    router.push(`/(tabs)/specialist/${specialist.id}`);
  };

  const handleTitlePress = (title: string) => {
    router.push(`/specialists/${encodeURIComponent(title)}`);
  };

  // Filter specialists based on selected filters
  const filteredSpecialists = useMemo(() => {
    const filtered: { [key: string]: Specialist[] } = {};
    
    // Merge Family Medicine specialists from database with mock data
    // Family Medicine section will show database specialists (if available)
    const specialistsToFilter: { [key: string]: Specialist[] } = {
      ...mockSpecialists,
    };
    
    // Always add Family Medicine section with database specialists
    // This ensures the section appears even if loading or empty
    specialistsToFilter['Family Medicine'] = familyMedicineSpecialists;
    
    Object.entries(specialistsToFilter).forEach(([specialty, specialists]) => {
      const filteredList = specialists.filter(specialist => {
        // Price filter
        let priceMatch = true;
        if (priceFilter === 'low') {
          priceMatch = specialist.price < 100;
        } else if (priceFilter === 'medium') {
          priceMatch = specialist.price >= 100 && specialist.price < 140;
        } else if (priceFilter === 'high') {
          priceMatch = specialist.price >= 140;
        }

        // Today availability filter
        let availabilityMatch = true;
        if (availabilityFilter === 'today' && specialist.nextAvailableTime) {
          availabilityMatch = specialist.nextAvailableTime.includes('Today');
        }

        // Rating filter
        let ratingMatch = true;
        if (ratingFilter === '4.5') {
          ratingMatch = specialist.rating >= 4.5;
        } else if (ratingFilter === '4.7') {
          ratingMatch = specialist.rating >= 4.7;
        } else if (ratingFilter === '4.9') {
          ratingMatch = specialist.rating >= 4.9;
        }

        return priceMatch && availabilityMatch && ratingMatch;
      });

      // Always include Family Medicine section even if empty (to show loading or empty state)
      // For other specialties, only include if they have specialists
      if (specialty === 'Family Medicine' || filteredList.length > 0) {
        filtered[specialty] = filteredList;
      }
    });

    console.log('[Family Medicine] Filtered specialists:', filtered);
    console.log('[Family Medicine] Family Medicine in filtered:', filtered['Family Medicine']);
    return filtered;
  }, [priceFilter, availabilityFilter, ratingFilter, familyMedicineSpecialists]);

  return (
    <ThemedView style={styles.container}>
      <FilterBar
        priceFilter={priceFilter}
        availabilityFilter={availabilityFilter}
        ratingFilter={ratingFilter}
        locationFilter={locationFilter}
        onPriceFilterChange={setPriceFilter}
        onAvailabilityFilterChange={setAvailabilityFilter}
        onRatingFilterChange={setRatingFilter}
        onLocationFilterChange={setLocationFilter}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.sectionsContainer}>
          {/* Always show Family Medicine section first */}
          {(() => {
            const fmSpecialists = filteredSpecialists['Family Medicine'] || [];
            console.log('[Family Medicine] Rendering section with specialists:', fmSpecialists.length);
            return (
              <SpecialistSection
                key="Family Medicine"
                title="Family Medicine"
                specialists={fmSpecialists}
                onSpecialistPress={handleSpecialistPress}
                onTitlePress={handleTitlePress}
                isFirst={true}
              />
            );
          })()}
          {/* Show other sections */}
          {Object.entries(filteredSpecialists)
            .filter(([specialty]) => specialty !== 'Family Medicine')
            .map(([specialty, specialists]) => (
              <SpecialistSection
                key={specialty}
                title={specialty}
                specialists={specialists}
                onSpecialistPress={handleSpecialistPress}
                onTitlePress={handleTitlePress}
              />
            ))}
          {Object.keys(filteredSpecialists).length === 0 && (
            <View style={styles.noResultsContainer}>
              <ThemedText style={styles.noResultsText}>
                No specialists found matching your filters
              </ThemedText>
            </View>
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  sectionsContainer: {
    paddingTop: 0,
    paddingBottom: 20,
    paddingLeft: 16,
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: 'center',
  },
});
