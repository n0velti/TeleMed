import type { Schema } from '@/amplify/data/resource';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppointments } from '@/hooks/use-appointments';
import { useAuth } from '@/hooks/use-auth';
import { Ionicons } from '@expo/vector-icons';
import { generateClient } from 'aws-amplify/data';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const client = generateClient<Schema>();

interface Specialist {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  experience: string;
  price: number;
  image?: string;
  bio?: string;
  languages?: string[];
  availability?: string[];
  nextAvailableTime?: string;
}

// Mock data for specialists
const allSpecialists: Record<string, Specialist> = {
  '1': { id: '1', name: 'Dr. Sarah Johnson', specialty: 'General Practice', rating: 4.8, experience: '8 years', price: 75, bio: 'Experienced general practitioner with a focus on preventive care and patient education.', languages: ['English', 'Spanish'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Today 2:00 PM' },
  '2': { id: '2', name: 'Dr. Michael Chen', specialty: 'Family Medicine', rating: 4.9, experience: '12 years', price: 85, bio: 'Dedicated family medicine physician specializing in comprehensive healthcare for all ages.', languages: ['English', 'Mandarin'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM', 'Sat 10AM-2PM'], nextAvailableTime: 'Today 3:30 PM' },
  '3': { id: '3', name: 'Dr. Emily Rodriguez', specialty: 'Internal Medicine', rating: 4.7, experience: '6 years', price: 70, bio: 'Internal medicine specialist with expertise in chronic disease management.', languages: ['English', 'Spanish'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Tomorrow 10:00 AM' },
  '4': { id: '4', name: 'Dr. David Thompson', specialty: 'General Practice', rating: 4.6, experience: '10 years', price: 80, bio: 'Compassionate general practitioner committed to personalized patient care.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Today 4:15 PM' },
  '5': { id: '5', name: 'Dr. Lisa Anderson', specialty: 'Family Medicine', rating: 4.8, experience: '9 years', price: 75, bio: 'Family medicine expert with a holistic approach to healthcare.', languages: ['English'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Tomorrow 9:00 AM' },
  '6': { id: '6', name: 'Dr. Robert Martinez', specialty: 'Internal Medicine', rating: 4.9, experience: '14 years', price: 90, bio: 'Highly experienced internal medicine physician with focus on complex diagnoses.', languages: ['English', 'Spanish'], availability: ['Tue 8AM-4PM', 'Thu 8AM-4PM', 'Sat 9AM-1PM'], nextAvailableTime: 'Today 5:00 PM' },
  '7': { id: '7', name: 'Dr. Jennifer White', specialty: 'General Practice', rating: 4.7, experience: '7 years', price: 70, bio: 'Patient-focused general practitioner dedicated to quality healthcare.', languages: ['English'], availability: ['Mon 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Tomorrow 11:30 AM' },
  '8': { id: '8', name: 'Dr. Christopher Lee', specialty: 'Family Medicine', rating: 4.8, experience: '11 years', price: 85, bio: 'Experienced family physician with emphasis on preventive medicine.', languages: ['English', 'Korean'], availability: ['Tue 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Today 1:00 PM' },
  '9': { id: '9', name: 'Dr. Lisa Wang', specialty: 'Dermatology', rating: 4.9, experience: '15 years', price: 120, bio: 'Board-certified dermatologist specializing in medical and cosmetic dermatology.', languages: ['English', 'Mandarin'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Today 2:30 PM' },
  '10': { id: '10', name: 'Dr. James Wilson', specialty: 'Dermatology', rating: 4.8, experience: '11 years', price: 110, bio: 'Expert dermatologist with focus on skin cancer prevention and treatment.', languages: ['English'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM'], nextAvailableTime: 'Tomorrow 1:00 PM' },
  '11': { id: '11', name: 'Dr. Maria Garcia', specialty: 'Dermatology', rating: 4.7, experience: '9 years', price: 100, bio: 'Skilled dermatologist specializing in acne and rosacea treatment.', languages: ['English', 'Spanish'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Today 3:00 PM' },
  '12': { id: '12', name: 'Dr. Robert Kim', specialty: 'Dermatology', rating: 4.9, experience: '13 years', price: 115, bio: 'Leading dermatologist with expertise in advanced skin treatments.', languages: ['English', 'Korean'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM', 'Sat 10AM-2PM'], nextAvailableTime: 'Tomorrow 10:30 AM' },
  '13': { id: '13', name: 'Dr. Amanda Taylor', specialty: 'Dermatology', rating: 4.8, experience: '10 years', price: 105, bio: 'Compassionate dermatologist focused on pediatric and adult skin care.', languages: ['English'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Today 4:00 PM' },
  '14': { id: '14', name: 'Dr. Daniel Brown', specialty: 'Dermatology', rating: 4.7, experience: '8 years', price: 95, bio: 'Dermatologist specializing in eczema and psoriasis management.', languages: ['English'], availability: ['Tue 8AM-4PM', 'Thu 8AM-4PM'], nextAvailableTime: 'Tomorrow 2:00 PM' },
  '15': { id: '15', name: 'Dr. Nicole Davis', specialty: 'Dermatology', rating: 4.9, experience: '16 years', price: 125, bio: 'Renowned dermatologist with extensive experience in cosmetic procedures.', languages: ['English', 'French'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Today 5:30 PM' },
  '16': { id: '16', name: 'Dr. Kevin Johnson', specialty: 'Dermatology', rating: 4.6, experience: '6 years', price: 90, bio: 'Young dermatologist with modern approach to skin health.', languages: ['English'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM', 'Sat 9AM-1PM'], nextAvailableTime: 'Tomorrow 9:30 AM' },
  '17': { id: '17', name: 'Dr. Jennifer Lee', specialty: 'Cardiology', rating: 4.9, experience: '18 years', price: 150, bio: 'Top cardiologist specializing in heart disease prevention and treatment.', languages: ['English', 'Mandarin'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Tomorrow 8:00 AM' },
  '18': { id: '18', name: 'Dr. Thomas Brown', specialty: 'Cardiology', rating: 4.8, experience: '14 years', price: 140, bio: 'Expert cardiologist with focus on interventional cardiology.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Today 3:00 PM' },
  '19': { id: '19', name: 'Dr. Amanda Davis', specialty: 'Cardiology', rating: 4.7, experience: '7 years', price: 120, bio: 'Cardiologist specializing in non-invasive cardiac imaging.', languages: ['English'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Tomorrow 11:00 AM' },
  '20': { id: '20', name: 'Dr. Christopher Taylor', specialty: 'Cardiology', rating: 4.9, experience: '16 years', price: 145, bio: 'Leading cardiologist with expertise in heart failure management.', languages: ['English'], availability: ['Tue 8AM-4PM', 'Thu 8AM-4PM', 'Sat 9AM-1PM'], nextAvailableTime: 'Today 4:30 PM' },
  '21': { id: '21', name: 'Dr. Rachel Green', specialty: 'Cardiology', rating: 4.8, experience: '12 years', price: 135, bio: 'Skilled cardiologist focused on preventive cardiology.', languages: ['English'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Tomorrow 1:30 PM' },
  '22': { id: '22', name: 'Dr. Mark Wilson', specialty: 'Cardiology', rating: 4.7, experience: '9 years', price: 125, bio: 'Cardiologist specializing in arrhythmia management.', languages: ['English'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM'], nextAvailableTime: 'Today 2:00 PM' },
  '23': { id: '23', name: 'Dr. Susan Martinez', specialty: 'Cardiology', rating: 4.9, experience: '15 years', price: 145, bio: 'Experienced cardiologist with focus on women\'s heart health.', languages: ['English', 'Spanish'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Tomorrow 9:30 AM' },
  '24': { id: '24', name: 'Dr. Matthew Anderson', specialty: 'Cardiology', rating: 4.8, experience: '11 years', price: 130, bio: 'Dedicated cardiologist specializing in cardiac rehabilitation.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM', 'Sat 10AM-2PM'], nextAvailableTime: 'Today 5:15 PM' },
  '25': { id: '25', name: 'Dr. Rachel Green', specialty: 'Psychiatry', rating: 4.8, experience: '12 years', price: 130, bio: 'Compassionate psychiatrist specializing in anxiety and depression.', languages: ['English'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Today 1:30 PM' },
  '26': { id: '26', name: 'Dr. Mark Anderson', specialty: 'Psychiatry', rating: 4.7, experience: '9 years', price: 115, bio: 'Psychiatrist focused on cognitive behavioral therapy.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Tomorrow 10:00 AM' },
  '27': { id: '27', name: 'Dr. Nicole Martinez', specialty: 'Psychiatry', rating: 4.9, experience: '11 years', price: 125, bio: 'Expert psychiatrist specializing in mood disorders.', languages: ['English', 'Spanish'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Today 3:30 PM' },
  '28': { id: '28', name: 'Dr. Kevin White', specialty: 'Psychiatry', rating: 4.6, experience: '8 years', price: 110, bio: 'Psychiatrist with focus on trauma and PTSD treatment.', languages: ['English'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM'], nextAvailableTime: 'Tomorrow 2:30 PM' },
  '29': { id: '29', name: 'Dr. Lisa Thompson', specialty: 'Psychiatry', rating: 4.8, experience: '13 years', price: 135, bio: 'Experienced psychiatrist specializing in adult and adolescent mental health.', languages: ['English'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Today 4:45 PM' },
  '30': { id: '30', name: 'Dr. David Kim', specialty: 'Psychiatry', rating: 4.7, experience: '10 years', price: 120, bio: 'Psychiatrist focused on medication management and psychotherapy.', languages: ['English', 'Korean'], availability: ['Tue 8AM-4PM', 'Thu 8AM-4PM', 'Sat 9AM-1PM'], nextAvailableTime: 'Tomorrow 9:00 AM' },
  '31': { id: '31', name: 'Dr. Emily Chen', specialty: 'Psychiatry', rating: 4.9, experience: '14 years', price: 140, bio: 'Leading psychiatrist with expertise in bipolar disorder treatment.', languages: ['English', 'Mandarin'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Today 2:15 PM' },
  '32': { id: '32', name: 'Dr. Michael Rodriguez', specialty: 'Psychiatry', rating: 4.6, experience: '7 years', price: 105, bio: 'Young psychiatrist with modern approach to mental health care.', languages: ['English', 'Spanish'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Tomorrow 11:30 AM' },
  '33': { id: '33', name: 'Dr. Susan Clark', specialty: 'Pediatrics', rating: 4.9, experience: '13 years', price: 95, bio: 'Expert pediatrician dedicated to child health and development.', languages: ['English'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Today 10:00 AM' },
  '34': { id: '34', name: 'Dr. Daniel Lewis', specialty: 'Pediatrics', rating: 4.8, experience: '10 years', price: 85, bio: 'Compassionate pediatrician specializing in newborn care.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Tomorrow 8:30 AM' },
  '35': { id: '35', name: 'Dr. Jessica Turner', specialty: 'Pediatrics', rating: 4.7, experience: '7 years', price: 75, bio: 'Pediatrician focused on preventive care and immunizations.', languages: ['English'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Today 1:45 PM' },
  '36': { id: '36', name: 'Dr. Matthew Hall', specialty: 'Pediatrics', rating: 4.9, experience: '15 years', price: 100, bio: 'Leading pediatrician with expertise in chronic childhood conditions.', languages: ['English'], availability: ['Tue 8AM-4PM', 'Thu 8AM-4PM', 'Sat 9AM-1PM'], nextAvailableTime: 'Tomorrow 3:00 PM' },
  '37': { id: '37', name: 'Dr. Sarah Wilson', specialty: 'Pediatrics', rating: 4.8, experience: '12 years', price: 90, bio: 'Skilled pediatrician specializing in adolescent medicine.', languages: ['English'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Today 2:30 PM' },
  '38': { id: '38', name: 'Dr. Robert Garcia', specialty: 'Pediatrics', rating: 4.7, experience: '9 years', price: 80, bio: 'Pediatrician with focus on developmental and behavioral issues.', languages: ['English', 'Spanish'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM'], nextAvailableTime: 'Tomorrow 10:15 AM' },
  '39': { id: '39', name: 'Dr. Jennifer Brown', specialty: 'Pediatrics', rating: 4.9, experience: '16 years', price: 105, bio: 'Renowned pediatrician specializing in allergy and asthma care.', languages: ['English'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Today 4:00 PM' },
  '40': { id: '40', name: 'Dr. Christopher Davis', specialty: 'Pediatrics', rating: 4.8, experience: '11 years', price: 85, bio: 'Dedicated pediatrician with emphasis on family-centered care.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM', 'Sat 10AM-2PM'], nextAvailableTime: 'Tomorrow 1:15 PM' },
  '41': { id: '41', name: 'Dr. Michael Johnson', specialty: 'Orthopedics', rating: 4.9, experience: '17 years', price: 155, bio: 'Top orthopedic surgeon specializing in sports medicine and joint replacement.', languages: ['English'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Tomorrow 8:00 AM' },
  '42': { id: '42', name: 'Dr. Lisa Williams', specialty: 'Orthopedics', rating: 4.8, experience: '13 years', price: 140, bio: 'Expert orthopedic surgeon focused on spine surgery.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Today 3:15 PM' },
  '43': { id: '43', name: 'Dr. David Miller', specialty: 'Orthopedics', rating: 4.7, experience: '10 years', price: 125, bio: 'Orthopedic surgeon specializing in hand and wrist surgery.', languages: ['English'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Tomorrow 11:45 AM' },
  '44': { id: '44', name: 'Dr. Sarah Wilson', specialty: 'Orthopedics', rating: 4.9, experience: '15 years', price: 150, bio: 'Leading orthopedic surgeon with expertise in pediatric orthopedics.', languages: ['English'], availability: ['Tue 8AM-4PM', 'Thu 8AM-4PM', 'Sat 9AM-1PM'], nextAvailableTime: 'Today 1:30 PM' },
  '45': { id: '45', name: 'Dr. Robert Moore', specialty: 'Orthopedics', rating: 4.8, experience: '12 years', price: 135, bio: 'Skilled orthopedic surgeon focused on arthroscopic surgery.', languages: ['English'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Tomorrow 2:00 PM' },
  '46': { id: '46', name: 'Dr. Jennifer Taylor', specialty: 'Orthopedics', rating: 4.7, experience: '8 years', price: 120, bio: 'Orthopedic surgeon specializing in trauma and fracture care.', languages: ['English'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM'], nextAvailableTime: 'Today 4:30 PM' },
  '47': { id: '47', name: 'Dr. Christopher Anderson', specialty: 'Orthopedics', rating: 4.9, experience: '14 years', price: 145, bio: 'Experienced orthopedic surgeon with focus on shoulder and elbow surgery.', languages: ['English'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Tomorrow 10:00 AM' },
  '48': { id: '48', name: 'Dr. Amanda Thomas', specialty: 'Orthopedics', rating: 4.8, experience: '11 years', price: 130, bio: 'Dedicated orthopedic surgeon specializing in hip and knee replacement.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM', 'Sat 10AM-2PM'], nextAvailableTime: 'Today 5:00 PM' },
  '49': { id: '49', name: 'Dr. Rachel Jackson', specialty: 'Neurology', rating: 4.9, experience: '16 years', price: 160, bio: 'Top neurologist specializing in stroke and cerebrovascular disease.', languages: ['English'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Tomorrow 9:00 AM' },
  '50': { id: '50', name: 'Dr. Mark White', specialty: 'Neurology', rating: 4.8, experience: '12 years', price: 145, bio: 'Expert neurologist focused on multiple sclerosis treatment.', languages: ['English'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM'], nextAvailableTime: 'Today 2:45 PM' },
  '51': { id: '51', name: 'Dr. Nicole Harris', specialty: 'Neurology', rating: 4.7, experience: '9 years', price: 130, bio: 'Neurologist specializing in headache and migraine management.', languages: ['English'], availability: ['Mon 10AM-6PM', 'Wed 10AM-6PM', 'Fri 10AM-6PM'], nextAvailableTime: 'Tomorrow 1:00 PM' },
  '52': { id: '52', name: 'Dr. Kevin Martin', specialty: 'Neurology', rating: 4.9, experience: '15 years', price: 155, bio: 'Leading neurologist with expertise in epilepsy treatment.', languages: ['English'], availability: ['Tue 8AM-4PM', 'Thu 8AM-4PM', 'Sat 9AM-1PM'], nextAvailableTime: 'Today 3:45 PM' },
  '53': { id: '53', name: 'Dr. Lisa Thompson', specialty: 'Neurology', rating: 4.8, experience: '13 years', price: 150, bio: 'Skilled neurologist focused on movement disorders and Parkinson\'s disease.', languages: ['English'], availability: ['Mon 9AM-5PM', 'Wed 9AM-5PM', 'Fri 9AM-5PM'], nextAvailableTime: 'Tomorrow 11:00 AM' },
  '54': { id: '54', name: 'Dr. David Garcia', specialty: 'Neurology', rating: 4.7, experience: '10 years', price: 135, bio: 'Neurologist specializing in neuromuscular disorders.', languages: ['English', 'Spanish'], availability: ['Tue 10AM-6PM', 'Thu 10AM-6PM'], nextAvailableTime: 'Today 4:15 PM' },
  '55': { id: '55', name: 'Dr. Emily Rodriguez', specialty: 'Neurology', rating: 4.9, experience: '14 years', price: 155, bio: 'Experienced neurologist with focus on dementia and cognitive disorders.', languages: ['English', 'Spanish'], availability: ['Mon 8AM-4PM', 'Wed 8AM-4PM', 'Fri 8AM-4PM'], nextAvailableTime: 'Tomorrow 2:30 PM' },
  '56': { id: '56', name: 'Dr. Michael Chen', specialty: 'Neurology', rating: 4.8, experience: '11 years', price: 140, bio: 'Dedicated neurologist specializing in sleep disorders.', languages: ['English', 'Mandarin'], availability: ['Tue 9AM-5PM', 'Thu 9AM-5PM', 'Sat 10AM-2PM'], nextAvailableTime: 'Today 5:30 PM' },
};

export default function SpecialistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userEmail } = useAuth();
  const { createAppointment, fetchAppointments, isLoading: isCreating } = useAppointments();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [appointmentPurpose, setAppointmentPurpose] = useState('');
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'images' | 'pricing' | 'info' | 'rating'>('images');
  const [appointmentType, setAppointmentType] = useState<'in-person' | 'virtual'>('virtual');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showAppointmentTypePicker, setShowAppointmentTypePicker] = useState(false);
  const defaultDaysUntilAvailable = 3;
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + defaultDaysUntilAvailable);
  const [checkoutDate, setCheckoutDate] = useState<Date>(defaultDate);
  const [checkoutTime, setCheckoutTime] = useState<string>('10:00 AM');
  const [checkoutDuration, setCheckoutDuration] = useState<string>('30 min');
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);

  // Fetch specialist from database
  useEffect(() => {
    const fetchSpecialist = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // First try to get from database
        const dbSpecialist = await client.models.Specialist.get({ id });
        
        if (dbSpecialist.data) {
          // Fetch specializations for this specialist
          const allSpecializations = await client.models.SpecialistSpecialization.list();
          const specializations = allSpecializations.data.filter(
            ss => ss.specialist_id === id
          );

          // Get specialization names
          let specialtyName = 'General Practice';
          if (specializations.length > 0) {
            const specIds = specializations.map(s => s.specialization_id);
            const allSpecs = await client.models.Specialization.list();
            const specialistSpec = allSpecs.data.find(s => specIds.includes(s.id));
            if (specialistSpec) {
              specialtyName = specialistSpec.name || 'General Practice';
            }
          }

          // Fetch availability
          const allAvailability = await client.models.Availability.list();
          const availability = allAvailability.data.filter(
            a => a.specialist_id === id
          );

          // Format availability
          const availabilityArray = availability.map(a => 
            `${a.weekday} ${a.start_time}-${a.end_time}`
          );

          // Map database specialist to component format
          const mappedSpecialist: Specialist = {
            id: dbSpecialist.data.id,
            name: `Dr. ${dbSpecialist.data.first_name} ${dbSpecialist.data.last_name}`,
            specialty: specialtyName,
            rating: 4.5, // Default - can be enhanced later
            experience: '10 years', // Default - can be enhanced later
            price: 85, // Default - can be enhanced later
            image: dbSpecialist.data.photo_url || undefined,
            bio: undefined, // Can be enhanced later
            languages: ['English'], // Default - can be enhanced later
            availability: availabilityArray.length > 0 ? availabilityArray : undefined,
            nextAvailableTime: 'Today 2:00 PM', // Default - can be enhanced later
          };

          setSpecialist(mappedSpecialist);
        } else {
          // Fall back to mock data if not found in database
          setSpecialist(allSpecialists[id] || null);
        }
      } catch (error) {
        console.error('Error fetching specialist:', error);
        // Fall back to mock data on error
        setSpecialist(allSpecialists[id] || null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecialist();
  }, [id]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
        <ThemedText>Loading specialist...</ThemedText>
      </ThemedView>
    );
  }

  if (!specialist) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>Specialist not found</ThemedText>
      </ThemedView>
    );
  }


  // Generate available appointment times
  const generateAvailableTimes = () => {
    const times = [];
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        times.push({ value: timeStr, display: displayTime });
      }
    }
    return times;
  };

  const handleBookAppointment = () => {
    setShowBookingConfirmation(true);
  };

  const calculateEndTime = (startTime: string, duration: string): string => {
    // Parse start time (e.g., "10:00 AM")
    const [timePart, period] = startTime.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;

    // Parse duration (e.g., "30 min")
    const durationMatch = duration.match(/(\d+)/);
    const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 30;

    // Calculate end time
    const startMinutes = hour24 * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    const endHour24 = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;

    // Convert to 12-hour format
    let endHour12 = endHour24 % 12;
    if (endHour12 === 0) endHour12 = 12;
    const endPeriod = endHour24 >= 12 ? 'PM' : 'AM';

    return `${endHour12}:${endMin.toString().padStart(2, '0')} ${endPeriod}`;
  };

  const handleConfirmBookingFromCheckout = async () => {
    if (!user || !userEmail) {
      Alert.alert('Error', 'You must be logged in to book an appointment.');
      return;
    }

    if (!specialist) {
      Alert.alert('Error', 'Specialist information not available.');
      return;
    }

    const endTime = calculateEndTime(checkoutTime, checkoutDuration);
    
    // Convert checkout time to 24-hour format for database
    const [timePart, period] = checkoutTime.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    const startTime24 = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Calculate end time in 24-hour format
    const [endTimePart, endPeriod] = endTime.split(' ');
    const [endHours, endMins] = endTimePart.split(':').map(Number);
    let endHour24 = endHours;
    if (endPeriod === 'PM' && endHours !== 12) endHour24 += 12;
    if (endPeriod === 'AM' && endHours === 12) endHour24 = 0;
    const endTime24 = `${endHour24.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Format date as YYYY-MM-DD
    const appointmentDate = checkoutDate.toISOString().split('T')[0];

    // Use the hook to create appointment
    const result = await createAppointment({
      specialistId: specialist.id,
      specialistName: specialist.name,
      specialistSpecialty: specialist.specialty,
      specialistPrice: specialist.price,
      appointmentDate: appointmentDate,
      startTime: startTime24,
      endTime: endTime24,
      duration: checkoutDuration,
      purpose: `${appointmentType === 'virtual' ? 'Virtual' : 'In-Person'} consultation`,
    });

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to book appointment. Please try again.');
      return;
    }

    // Refresh appointments
    await fetchAppointments();

    setShowBookingConfirmation(false);

    Alert.alert(
      'Success', 
      `Your appointment with ${specialist.name} has been booked for ${checkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${checkoutTime}!`,
      [{ text: 'OK', onPress: () => router.push('/(tabs)/schedule') }]
    );
  };

  const handleCancelBooking = () => {
    setShowBookingConfirmation(false);
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return '';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const durationMinutes = endMinutes - startMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleConfirmBooking = async () => {
    if (!startTime || !endTime || !appointmentPurpose.trim()) {
      Alert.alert('Error', 'Please select both start and end times and enter a purpose for the appointment.');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Error', 'End time must be after start time.');
      return;
    }

    if (!user || !userEmail) {
      Alert.alert('Error', 'You must be logged in to book an appointment.');
      return;
    }

    const duration = calculateDuration();
    
    // Use the hook to create appointment
    const result = await createAppointment({
      specialistId: specialist.id,
      specialistName: specialist.name,
      specialistSpecialty: specialist.specialty,
      specialistPrice: specialist.price,
      appointmentDate: selectedDate,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      purpose: appointmentPurpose,
    });

    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to book appointment. Please try again.');
      return;
    }

    setShowBookingModal(false);

    Alert.alert(
      'Success', 
      `Your appointment with ${specialist.name} has been booked for ${selectedDate} from ${startTime} to ${endTime} (${duration})!`,
      [{ text: 'OK', onPress: () => router.push('/(tabs)/schedule') }]
    );

    // Reset form
    setStartTime('');
    setEndTime('');
    setAppointmentPurpose('');
  };

  const availableTimes = generateAvailableTimes();

  const getGradientColors = (id: string): readonly [string, string] => {
    const gradients: readonly [string, string][] = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#30cfd0', '#330867'],
      ['#a8edea', '#fed6e3'],
      ['#ff9a9e', '#fecfef'],
    ];
    // Handle non-numeric IDs by hashing them to a number
    let numericId = 0;
    if (id) {
      // If ID is numeric, use it directly
      const parsed = parseInt(id);
      if (!isNaN(parsed)) {
        numericId = parsed;
      } else {
        // Hash the string ID to a number
        for (let i = 0; i < id.length; i++) {
          numericId = ((numericId << 5) - numericId) + id.charCodeAt(i);
          numericId = numericId & numericId; // Convert to 32bit integer
        }
        numericId = Math.abs(numericId);
      }
    }
    const index = numericId % gradients.length;
    return gradients[index];
  };

  // Ensure gradientColors is always defined - use fallback if specialist doesn't exist yet
  const gradientColors: readonly [string, string] = specialist && specialist.id 
    ? getGradientColors(specialist.id) 
    : ['#667eea', '#764ba2'];

  return (
    <ThemedView style={styles.container}>
        <View style={styles.layoutWrapper}>
          <View style={styles.mainLayout}>
          {/* Left Column - Profile, Bio, Tabs */}
          <View style={styles.leftColumn}>
            <ScrollView 
              style={styles.scrollView} 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled={true}
            >
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                {/* Profile Picture with Gradient Border */}
                <View style={styles.profilePictureContainer}>
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.profilePictureBorder}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.profilePictureInner}
                    >
                      <ThemedText style={styles.initialsText}>
                        {specialist.name.split(' ').map(n => n[0]).join('')}
                      </ThemedText>
                    </LinearGradient>
                  </LinearGradient>
                </View>

                {/* Name and Info Row */}
                <View style={styles.nameInfoContainer}>
                  <View style={styles.nameSpecialtyContainer}>
                    <View style={styles.nameRow}>
                      <ThemedText style={styles.profileName}>{specialist.name}</ThemedText>
                      <View style={styles.verifiedBadge}>
                        <ThemedText style={styles.verifiedText}>✓</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.profileSpecialty}>{specialist.specialty}</ThemedText>
                  </View>
                </View>
              </View>

              {/* Bio */}
              {specialist.bio && (
                <View style={styles.bioContainer}>
                  <ThemedText style={styles.profileBio}>{specialist.bio}</ThemedText>
                </View>
              )}

              {/* Tabs */}
              <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'images' && styles.activeTab]}
              onPress={() => setActiveTab('images')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'images' && styles.activeTabText]}>
                Images
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'pricing' && styles.activeTab]}
              onPress={() => setActiveTab('pricing')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'pricing' && styles.activeTabText]}>
                Pricing
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'info' && styles.activeTab]}
              onPress={() => setActiveTab('info')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
                Info
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'rating' && styles.activeTab]}
              onPress={() => setActiveTab('rating')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'rating' && styles.activeTabText]}>
                Rating
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'images' && (
            <View style={styles.tabContent}>
              <View style={styles.contentGrid}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
                  const photoGradients: readonly [string, string][] = [
                    ['#667eea', '#764ba2'],
                    ['#f093fb', '#f5576c'],
                    ['#4facfe', '#00f2fe'],
                    ['#43e97b', '#38f9d7'],
                    ['#fa709a', '#fee140'],
                    ['#30cfd0', '#330867'],
                    ['#a8edea', '#fed6e3'],
                    ['#ff9a9e', '#fecfef'],
                    ['#667eea', '#764ba2'],
                  ];
                  return (
                    <LinearGradient
                      key={index}
                      colors={photoGradients[index]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.gridItem}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {activeTab === 'pricing' && (
            <View style={styles.tabContent}>
              <View style={styles.pricingContent}>
                {/* Price Row */}
                <View style={styles.sidebarRow}>
                  <View style={styles.sidebarRowLabelContainer}>
                    <ThemedText style={styles.sidebarRowLabel}>Price</ThemedText>
                    <ThemedText style={styles.dateSublabel}>Starting at</ThemedText>
                  </View>
                  <View style={styles.amazonPriceContainer}>
                    <ThemedText style={styles.amazonDollarSign}>$</ThemedText>
                    <View style={styles.amazonPriceMainContainer}>
                      <ThemedText style={styles.amazonPriceMain}>
                        {Math.floor(specialist.price).toLocaleString()}
                      </ThemedText>
                      <ThemedText style={styles.amazonPriceCents}>
                        {Math.round((specialist.price % 1) * 100).toString().padStart(2, '0')}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Duration Row */}
                <View style={styles.sidebarRow}>
                  <ThemedText style={styles.sidebarRowLabel}>Duration</ThemedText>
                  <ThemedText style={styles.sidebarRowValue}>45 minutes</ThemedText>
                </View>

                {/* Consultation Type Row */}
                <View style={styles.sidebarRow}>
                  <ThemedText style={styles.sidebarRowLabel}>Consultation Type</ThemedText>
                  <ThemedText style={styles.sidebarRowValue}>Standard</ThemedText>
                </View>

                {/* Features Section */}
                <View style={styles.sidebarRowVertical}>
                  <ThemedText style={styles.sidebarRowLabel}>Includes</ThemedText>
                  <View style={styles.featuresList}>
                    <ThemedText style={styles.featureItem}>✓ 45-minute consultation</ThemedText>
                    <ThemedText style={styles.featureItem}>✓ Follow-up support via message</ThemedText>
                    <ThemedText style={styles.featureItem}>✓ Prescription management</ThemedText>
                    <ThemedText style={styles.featureItem}>✓ Medical records access</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'info' && (
            <View style={styles.tabContent}>
              <View style={styles.infoContent}>
                {/* Languages Row */}
                <View style={styles.sidebarRowVertical}>
                  <ThemedText style={styles.sidebarRowLabel}>Languages</ThemedText>
                  <View style={styles.languagesRow}>
                    {specialist.languages && specialist.languages.map((language, index) => (
                      <View key={index} style={styles.languageTag}>
                        <ThemedText style={styles.languageText}>{language}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Availability Rows */}
                {specialist.availability && specialist.availability.map((slot, index) => (
                  <View key={index} style={styles.sidebarRow}>
                    <ThemedText style={styles.sidebarRowLabel}>Availability</ThemedText>
                    <ThemedText style={styles.sidebarRowValue}>{slot}</ThemedText>
                  </View>
                ))}

                {/* Office Location Row */}
                <View style={styles.sidebarRowVertical}>
                  <ThemedText style={styles.sidebarRowLabel}>Office Location</ThemedText>
                  <ThemedText style={styles.sidebarRowValueVertical}>123 Medical Plaza, Suite 456, New York, NY 10001</ThemedText>
                </View>

                {/* Office Hours Row */}
                <View style={styles.sidebarRow}>
                  <ThemedText style={styles.sidebarRowLabel}>Office Hours</ThemedText>
                  <ThemedText style={styles.sidebarRowValue}>Mon-Fri, 9AM-5PM</ThemedText>
                </View>
              </View>
            </View>
          )}

          {activeTab === 'rating' && (
            <View style={styles.tabContent}>
              <View style={styles.ratingContent}>
                <View style={styles.ratingHeader}>
                  <ThemedText style={styles.ratingNumber}>{specialist.rating}</ThemedText>
                  <View style={styles.ratingStars}>
                    <ThemedText style={styles.starsText}>⭐⭐⭐⭐⭐</ThemedText>
                    <ThemedText style={styles.reviewCount}>Based on 127 reviews</ThemedText>
                  </View>
                </View>
                <View style={styles.reviewItem}>
                  <ThemedText style={styles.reviewAuthor}>John D.</ThemedText>
                  <ThemedText style={styles.reviewText}>Excellent doctor! Very professional and caring.</ThemedText>
                  <ThemedText style={styles.reviewDate}>2 weeks ago</ThemedText>
                </View>
                <View style={styles.reviewItem}>
                  <ThemedText style={styles.reviewAuthor}>Sarah M.</ThemedText>
                  <ThemedText style={styles.reviewText}>Highly recommend. Took time to explain everything.</ThemedText>
                  <ThemedText style={styles.reviewDate}>1 month ago</ThemedText>
                </View>
                <View style={styles.reviewItem}>
                  <ThemedText style={styles.reviewAuthor}>Mike R.</ThemedText>
                  <ThemedText style={styles.reviewText}>Great experience. Very knowledgeable and friendly.</ThemedText>
                  <ThemedText style={styles.reviewDate}>2 months ago</ThemedText>
                </View>
              </View>
            </View>
          )}

              <View style={styles.spacer} />
            </ScrollView>
          </View>

          {/* Right Column - Booking Sidebar (Fixed) */}
          <View style={styles.rightSidebar}>
            {!showBookingConfirmation ? (
              <>
                <ScrollView 
                  style={styles.sidebarScrollView} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.sidebarScrollContent}
                >
                  <View style={styles.sidebarContent}>
                    {/* Pricing */}
                    <View style={styles.sidebarRow}>
                      <View>
                        <ThemedText style={styles.sidebarRowLabel}>Price</ThemedText>
                        <ThemedText style={styles.sidebarPriceSublabel}>Starting at</ThemedText>
                      </View>
                      <View style={styles.amazonPriceContainer}>
                        <ThemedText style={styles.amazonDollarSign}>$</ThemedText>
                        <View style={styles.amazonPriceMainContainer}>
                          <ThemedText style={styles.amazonPriceMain}>
                            {Math.floor(specialist.price).toLocaleString()}
                          </ThemedText>
                          <ThemedText style={styles.amazonPriceCents}>
                            {Math.round((specialist.price % 1) * 100).toString().padStart(2, '0')}
                          </ThemedText>
                        </View>
                      </View>
                    </View>

                    {/* Insurance Coverage */}
                    <View style={styles.sidebarRow}>
                      <ThemedText style={styles.sidebarRowLabel} numberOfLines={1}>Covered by Insurance</ThemedText>
                      <ThemedText style={[styles.sidebarRowValue, styles.insuranceCovered]}>✓</ThemedText>
                    </View>

                    {/* Location */}
                    <View style={styles.sidebarRowVertical}>
                      <ThemedText style={styles.sidebarRowLabel}>Location</ThemedText>
                      <ThemedText style={styles.sidebarRowValueVertical}>123 Medical Plaza, Suite 456, New York, NY 10001</ThemedText>
                    </View>
                  </View>
                </ScrollView>
                
                {/* User Modifiable Variables - Fixed Above Buttons */}
                <View style={styles.sidebarBookingOptions}>
                  {/* Appointment Type Selection */}
                  <TouchableOpacity 
                    style={styles.sidebarRow}
                    onPress={() => setShowAppointmentTypePicker(true)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.sidebarRowLabel}>Appointment Type</ThemedText>
                    <View style={styles.sidebarRowValueWithIcon}>
                      <ThemedText style={styles.sidebarRowValueText}>
                        {appointmentType === 'virtual' ? 'Virtual' : 'In-Person'}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={16} color="#999" style={styles.editIcon} />
                    </View>
                  </TouchableOpacity>

                  {/* Date Selection */}
                  <TouchableOpacity 
                    style={styles.sidebarRow}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sidebarRowLabelContainer}>
                      <ThemedText style={styles.sidebarRowLabel}>Date</ThemedText>
                      <ThemedText style={styles.dateSublabel}>Next available in {defaultDaysUntilAvailable} days</ThemedText>
                    </View>
                    <View style={styles.sidebarRowValueWithIcon}>
                      <ThemedText style={styles.sidebarRowValue}>
                        {checkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={16} color="#999" style={styles.editIcon} />
                    </View>
                  </TouchableOpacity>

                  {/* Time Selection */}
                  <TouchableOpacity 
                    style={styles.sidebarRow}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.sidebarRowLabel}>Time</ThemedText>
                    <View style={styles.sidebarRowValueWithIcon}>
                      <ThemedText style={styles.sidebarRowValueText}>
                        {checkoutTime}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={16} color="#999" style={styles.editIcon} />
                    </View>
                  </TouchableOpacity>

                  {/* Duration Selection */}
                  <TouchableOpacity 
                    style={styles.sidebarRow}
                    onPress={() => setShowDurationPicker(true)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.sidebarRowLabel}>Duration</ThemedText>
                    <View style={styles.sidebarRowValueWithIcon}>
                      <ThemedText style={styles.sidebarRowValueText}>
                        {checkoutDuration}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={16} color="#999" style={styles.editIcon} />
                    </View>
                  </TouchableOpacity>
                </View>
                
                {/* Action Buttons - Fixed at Bottom */}
                <View style={styles.sidebarButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.sidebarBookButton}
                    onPress={handleBookAppointment}
                    activeOpacity={0.8}
                  >
                    <ThemedText style={styles.sidebarBookButtonText}>Book Appointment</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.sidebarMessageButton} activeOpacity={0.8}>
                    <ThemedText style={styles.sidebarMessageButtonText}>Message</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Booking Confirmation View */
              <ScrollView 
                style={styles.sidebarScrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sidebarScrollContent}
              >
                <View style={styles.sidebarContent}>
                  <ThemedText style={styles.confirmationTitle}>Confirm Booking</ThemedText>
                  
                  {/* Booking Details */}
                  <View style={styles.sidebarRowVertical}>
                    <ThemedText style={styles.sidebarRowLabel}>Specialist</ThemedText>
                    <ThemedText style={styles.sidebarRowValueVertical}>{specialist.name}</ThemedText>
                  </View>

                  <View style={styles.sidebarRow}>
                    <ThemedText style={styles.sidebarRowLabel}>Appointment Type</ThemedText>
                    <ThemedText style={styles.sidebarRowValue}>{appointmentType === 'virtual' ? 'Virtual' : 'In-Person'}</ThemedText>
                  </View>

                  <View style={styles.sidebarRow}>
                    <ThemedText style={styles.sidebarRowLabel}>Date</ThemedText>
                    <ThemedText style={styles.sidebarRowValue}>
                      {checkoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </ThemedText>
                  </View>

                  <View style={styles.sidebarRow}>
                    <ThemedText style={styles.sidebarRowLabel}>Time</ThemedText>
                    <ThemedText style={styles.sidebarRowValue}>
                      {checkoutTime} - {calculateEndTime(checkoutTime, checkoutDuration)}
                    </ThemedText>
                  </View>

                  <View style={styles.sidebarRow}>
                    <ThemedText style={styles.sidebarRowLabel}>Duration</ThemedText>
                    <ThemedText style={styles.sidebarRowValue}>{checkoutDuration}</ThemedText>
                  </View>

                  <View style={styles.sidebarRow}>
                    <View>
                      <ThemedText style={styles.sidebarRowLabel}>Price</ThemedText>
                      <ThemedText style={styles.dateSublabel}>Starting at</ThemedText>
                    </View>
                    <View style={styles.amazonPriceContainer}>
                      <ThemedText style={styles.amazonDollarSign}>$</ThemedText>
                      <View style={styles.amazonPriceMainContainer}>
                        <ThemedText style={styles.amazonPriceMain}>
                          {Math.floor(specialist.price).toLocaleString()}
                        </ThemedText>
                        <ThemedText style={styles.amazonPriceCents}>
                          {Math.round((specialist.price % 1) * 100).toString().padStart(2, '0')}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
            
            {/* Confirmation Buttons - Fixed at Bottom */}
            {showBookingConfirmation && (
              <View style={styles.sidebarButtonsContainer}>
                <TouchableOpacity 
                  style={styles.sidebarCancelButton}
                  onPress={handleCancelBooking}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.sidebarCancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sidebarBookButton}
                  onPress={handleConfirmBookingFromCheckout}
                  activeOpacity={0.8}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.sidebarBookButtonText}>Confirm Booking</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          </View>
        </View>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Book Appointment</ThemedText>
              <TouchableOpacity 
                onPress={() => setShowBookingModal(false)}
                style={styles.closeModalButton}
              >
                <ThemedText style={styles.closeModalText}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedView style={styles.specialistInfo}>
                <ThemedText style={styles.modalSpecialistName}>{specialist.name}</ThemedText>
                <ThemedText style={styles.modalSpecialistSpecialty}>{specialist.specialty}</ThemedText>
              </ThemedView>

              <View style={styles.formSection}>
                <ThemedText style={styles.formLabel}>Select Date</ThemedText>
                <TextInput
                  style={styles.formInput}
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText style={styles.formLabel}>Start Time</ThemedText>
                <ScrollView 
                  style={styles.timeSlotContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {availableTimes.map((time, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlot,
                        startTime === time.value && styles.timeSlotSelected
                      ]}
                      onPress={() => setStartTime(time.value)}
                    >
                      <ThemedText style={[
                        styles.timeSlotText,
                        startTime === time.value && styles.timeSlotTextSelected
                      ]}>
                        {time.display}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formSection}>
                <ThemedText style={styles.formLabel}>End Time</ThemedText>
                <ScrollView 
                  style={styles.timeSlotContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  {availableTimes.map((time, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlot,
                        endTime === time.value && styles.timeSlotSelected
                      ]}
                      onPress={() => setEndTime(time.value)}
                    >
                      <ThemedText style={[
                        styles.timeSlotText,
                        endTime === time.value && styles.timeSlotTextSelected
                      ]}>
                        {time.display}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {startTime && endTime && (
                <View style={styles.durationContainer}>
                  <ThemedText style={styles.durationLabel}>
                    Meeting Duration: {calculateDuration()}
                  </ThemedText>
                </View>
              )}

              <View style={styles.formSection}>
                <ThemedText style={styles.formLabel}>Purpose of Appointment</ThemedText>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={appointmentPurpose}
                  onChangeText={setAppointmentPurpose}
                  placeholder="Describe the reason for your appointment..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowBookingModal(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, (!startTime || !endTime || !appointmentPurpose.trim() || isCreating) && styles.confirmButtonDisabled]}
                onPress={handleConfirmBooking}
                disabled={!startTime || !endTime || !appointmentPurpose.trim() || isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.confirmButtonText}>Confirm Booking</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Date</ThemedText>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={styles.closeModalButton}
              >
                <ThemedText style={styles.closeModalText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.datePickerContent}>
              {/* Simple date selection - generate next 30 days */}
              {Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const isSelected = checkoutDate.toDateString() === date.toDateString();
                
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => {
                      setCheckoutDate(date);
                      setShowDatePicker(false);
                    }}
                  >
                    <ThemedText style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                      {date.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Time</ThemedText>
              <TouchableOpacity 
                onPress={() => setShowTimePicker(false)}
                style={styles.closeModalButton}
              >
                <ThemedText style={styles.closeModalText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.datePickerContent}>
              {/* Generate time slots */}
              {Array.from({ length: 10 }, (_, i) => {
                const hour = i + 8; // Start from 8 AM, end at 5 PM
                const time12 = hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
                const isSelected = checkoutTime === time12;
                
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => {
                      setCheckoutTime(time12);
                      setShowTimePicker(false);
                    }}
                  >
                    <ThemedText style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                      {time12}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Duration Picker Modal */}
      <Modal
        visible={showDurationPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Duration</ThemedText>
              <TouchableOpacity 
                onPress={() => setShowDurationPicker(false)}
                style={styles.closeModalButton}
              >
                <ThemedText style={styles.closeModalText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.datePickerContent}>
              {/* Duration options */}
              {['15 min', '30 min', '45 min', '60 min', '90 min'].map((duration, i) => {
                const isSelected = checkoutDuration === duration;
                
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => {
                      setCheckoutDuration(duration);
                      setShowDurationPicker(false);
                    }}
                  >
                    <ThemedText style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                      {duration}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Appointment Type Picker Modal */}
      <Modal
        visible={showAppointmentTypePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAppointmentTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Appointment Type</ThemedText>
              <TouchableOpacity 
                onPress={() => setShowAppointmentTypePicker(false)}
                style={styles.closeModalButton}
              >
                <ThemedText style={styles.closeModalText}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.datePickerContent}>
              {/* Appointment type options */}
              {['Virtual', 'In-Person'].map((type, i) => {
                const isSelected = (appointmentType === 'virtual' && type === 'Virtual') || 
                                  (appointmentType === 'in-person' && type === 'In-Person');
                
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                    onPress={() => {
                      setAppointmentType(type === 'Virtual' ? 'virtual' : 'in-person');
                      setShowAppointmentTypePicker(false);
                    }}
                  >
                    <ThemedText style={[styles.dateOptionText, isSelected && styles.dateOptionTextSelected]}>
                      {type}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  layoutWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  mainLayout: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 950,
    flex: 1,
    alignItems: 'flex-start',
    position: 'relative',
    minHeight: 0,
    paddingRight: 360,
  },
  leftColumn: {
    flex: 1,
    maxWidth: 600,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
    flexGrow: 1,
  },
  scrollContent: {
    paddingVertical: 0,
  },
  rightSidebar: {
    width: 320,
    position: 'absolute',
    right: 20,
    top: 20,
    bottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  sidebarScrollView: {
    flex: 1,
  },
  sidebarScrollContent: {
    flexGrow: 1,
  },
  sidebarContent: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sidebarBookingOptions: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sidebarButtonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
  sidebarSpacer: {
    flex: 1,
    minHeight: 20,
  },
  sidebarSection: {
    marginBottom: 0,
    marginTop: 0,
  },
  sidebarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  sidebarRowLabel: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
    flex: 1,
    flexShrink: 1,
  },
  sidebarRowLabelContainer: {
    flex: 1,
    flexShrink: 1,
  },
  sidebarRowValue: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'right',
    flexShrink: 0,
    marginLeft: 12,
    minWidth: 20,
  },
  sidebarRowValueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    marginLeft: 12,
  },
  sidebarRowValueText: {
    fontSize: 14,
    fontWeight: '400',
  },
  editIcon: {
    marginLeft: 4,
  },
  insuranceCovered: {
    color: '#22c55e',
    fontSize: 18,
  },
  insuranceNotCovered: {
    color: '#ef4444',
    fontSize: 18,
  },
  sidebarRowValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  sidebarRowVertical: {
    flexDirection: 'column',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  sidebarRowLabelVertical: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
    marginTop: 0,
    marginBottom: 0,
  },
  dateSublabel: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  appointmentTypeRow: {
    paddingTop: 0,
  },
  sidebarRowValueVertical: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  segmentedControlContainerVertical: {
    marginTop: 4,
    alignItems: 'flex-start',
    width: '100%',
  },
  pricingBox: {
    marginBottom: 0,
  },
  sidebarPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
    textAlign: 'right',
  },
  amazonPriceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  amazonDollarSign: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 14,
    marginRight: 2,
    marginTop: 2,
  },
  amazonPriceMainContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  amazonPriceMain: {
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
  },
  amazonPriceCents: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 14,
    marginLeft: 2,
    marginTop: 2,
  },
  sidebarPriceSublabel: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: -4,
  },
  sidebarPriceUnit: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'right',
  },
  insuranceBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  insuranceText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  sidebarBookButton: {
    backgroundColor: '#E50914',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    height: 36,
  },
  sidebarBookButtonText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#fff',
  },
  sidebarMessageButton: {
    backgroundColor: '#F2F2F7',
    borderWidth: 0,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  sidebarMessageButtonText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#E50914',
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  sidebarCancelButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    height: 36,
  },
  sidebarCancelButtonText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#000',
  },
  sidebarSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  segmentedControl: {
    height: 36,
  },
  segmentedControlContainer: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  segmentedControlInline: {
    height: 36,
    width: '100%',
  },
  sidebarLocationText: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  nextAvailableText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0095f6',
  },
  profileContainer: {
    width: '100%',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 20,
    gap: 20,
  },
  profilePictureContainer: {
    marginBottom: 0,
  },
  profilePictureBorder: {
    width: 86,
    height: 86,
    borderRadius: 43,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameInfoContainer: {
    flex: 1,
  },
  nameSpecialtyContainer: {
    height: 86,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0095f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  verifiedText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  profileSpecialty: {
    fontSize: 13,
    opacity: 0.6,
  },
  bioContainer: {
    width: '100%',
    maxWidth: 950,
    paddingHorizontal: 16,
    paddingVertical: 0,
    marginBottom: 24,
    flexDirection: 'row',
  },
  profileBio: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 600,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#0095f6',
    paddingVertical: 6,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  messageButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    paddingVertical: 6,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    width: 36,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
    paddingVertical: 6,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '300',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.5,
  },
  activeTabText: {
    opacity: 1,
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 200,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridItem: {
    width: '33.1%',
    aspectRatio: 1,
  },
  locationContent: {
    padding: 20,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  locationHours: {
    fontSize: 13,
    marginTop: 12,
    opacity: 0.6,
  },
  pricingContent: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 6,
    opacity: 0.8,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  pricingAmount: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  pricingUnit: {
    fontSize: 16,
    opacity: 0.6,
    marginLeft: 6,
  },
  pricingDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.7,
  },
  pricingFeatures: {
    gap: 10,
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricingFeatureText: {
    fontSize: 14,
    opacity: 0.7,
  },
  infoContent: {
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 0,
    opacity: 0.8,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  languageTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  languageText: {
    fontSize: 13,
  },
  availabilityText: {
    fontSize: 13,
    marginBottom: 4,
    opacity: 0.7,
  },
  ratingContent: {
    padding: 16,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  ratingNumber: {
    fontSize: 52,
    fontWeight: 'bold',
  },
  ratingStars: {
    flex: 1,
  },
  starsText: {
    fontSize: 20,
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 12,
    opacity: 0.6,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.05)',
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
    opacity: 0.8,
  },
  reviewDate: {
    fontSize: 11,
    opacity: 0.5,
  },
  spacer: {
    height: 30,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.6,
  },
  loader: {
    marginVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  datePickerContent: {
    padding: 20,
    maxHeight: 400,
  },
  dateOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateOptionSelected: {
    backgroundColor: '#E50914',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#000',
  },
  dateOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeModalButton: {
    padding: 8,
  },
  closeModalText: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  specialistInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalSpecialistName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSpecialistSpecialty: {
    fontSize: 14,
    opacity: 0.6,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#000',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  timeSlotContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  timeSlot: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeSlotSelected: {
    backgroundColor: '#0095f6',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666666',
  },
  timeSlotTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0095f6',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  durationContainer: {
    marginTop: -16,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0095f6',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0095f6',
    textAlign: 'center',
  },
});

