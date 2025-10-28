import { StaticSidebar } from '@/components/static-sidebar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

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
  const specialist = allSpecialists[id];

  if (!specialist) {
    return (
      <View style={styles.wrapper}>
        <Stack.Screen options={{ headerShown: false }} />
        <StaticSidebar />
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>Specialist not found</ThemedText>
        </ThemedView>
      </View>
    );
  }


  const handleBookAppointment = () => {
    Alert.alert(
      'Book Appointment',
      `Book an appointment with ${specialist.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => {
            Alert.alert('Success', 'Your appointment has been booked!');
            router.back();
          }
        },
      ]
    );
  };

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
    const index = parseInt(id) % gradients.length;
    return gradients[index];
  };

  const gradientColors = getGradientColors(specialist.id);
  const [activeTab, setActiveTab] = useState<'images' | 'location' | 'info' | 'rating'>('images');

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
          <View style={styles.profileContainer}>
            {/* Profile Header */}
            <ThemedView style={styles.profileHeader}>
            {/* Profile Picture */}
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profilePicture}
            >
              <ThemedText style={styles.initialsText}>
                {specialist.name.split(' ').map(n => n[0]).join('')}
              </ThemedText>
            </LinearGradient>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>{specialist.experience}</ThemedText>
                <ThemedText style={styles.statLabel}>Experience</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>{specialist.rating}</ThemedText>
                <ThemedText style={styles.statLabel}>Rating</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statNumber}>${specialist.price}</ThemedText>
                <ThemedText style={styles.statLabel}>Per Session</ThemedText>
              </View>
            </View>

            {/* Name and Bio */}
            <View style={styles.profileInfo}>
              <ThemedText style={styles.profileName}>{specialist.name}</ThemedText>
              <ThemedText style={styles.profileSpecialty}>{specialist.specialty}</ThemedText>
              <ThemedText style={styles.profileBio}>{specialist.bio}</ThemedText>
            </View>

            {/* Next Available Time */}
            {specialist.nextAvailableTime && (
              <View style={styles.nextAvailableContainer}>
                <ThemedText style={styles.nextAvailableLabel}>Next Available</ThemedText>
                <ThemedText style={styles.nextAvailableTime}>🕐 {specialist.nextAvailableTime}</ThemedText>
              </View>
            )}

            {/* Action Button */}
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={handleBookAppointment}
              activeOpacity={0.8}
            >
              <ThemedText style={styles.bookButtonText}>Book Appointment</ThemedText>
            </TouchableOpacity>
          </ThemedView>

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
              style={[styles.tab, activeTab === 'location' && styles.activeTab]}
              onPress={() => setActiveTab('location')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'location' && styles.activeTabText]}>
                Location
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'info' && styles.activeTab]}
              onPress={() => setActiveTab('info')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
                Other Info
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
              <View style={styles.grid}>
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

          {activeTab === 'location' && (
            <View style={styles.tabContent}>
              <View style={styles.locationContent}>
                <ThemedText style={styles.locationTitle}>Office Location</ThemedText>
                <ThemedText style={styles.locationText}>123 Medical Plaza</ThemedText>
                <ThemedText style={styles.locationText}>Suite 456</ThemedText>
                <ThemedText style={styles.locationText}>New York, NY 10001</ThemedText>
                <ThemedText style={styles.locationHours}>Office Hours: Mon-Fri, 9AM-5PM</ThemedText>
              </View>
            </View>
          )}

          {activeTab === 'info' && (
            <View style={styles.tabContent}>
              <View style={styles.infoContent}>
                <ThemedText style={styles.infoSectionTitle}>Languages</ThemedText>
                <View style={styles.languagesRow}>
                  {specialist.languages && specialist.languages.map((language, index) => (
                    <View key={index} style={styles.languageTag}>
                      <ThemedText style={styles.languageText}>{language}</ThemedText>
                    </View>
                  ))}
                </View>
                <ThemedText style={styles.infoSectionTitle}>Availability</ThemedText>
                {specialist.availability && specialist.availability.map((slot, index) => (
                  <ThemedText key={index} style={styles.availabilityText}>• {slot}</ThemedText>
                ))}
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
          </View>
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
  profileContainer: {
    width: '100%',
    maxWidth: 600,
  },
  profileHeader: {
    padding: 20,
    paddingTop: 20,
  },
  profilePicture: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  initialsText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 18,
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  profileInfo: {
    marginBottom: 14,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileSpecialty: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 13,
    lineHeight: 18,
  },
  nextAvailableContainer: {
    backgroundColor: 'rgba(0, 149, 246, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 149, 246, 0.2)',
  },
  nextAvailableLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextAvailableTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0095f6',
  },
  bookButton: {
    backgroundColor: '#0095f6',
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridItem: {
    width: '32.8%',
    aspectRatio: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
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
  infoContent: {
    padding: 20,
  },
  infoSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 8,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  languageTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  languageText: {
    fontSize: 13,
  },
  availabilityText: {
    fontSize: 13,
    marginBottom: 6,
    opacity: 0.8,
  },
  ratingContent: {
    padding: 20,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  ratingStars: {
    flex: 1,
  },
  starsText: {
    fontSize: 18,
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
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
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
});

