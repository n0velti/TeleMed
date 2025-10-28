import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

export default function GetCareScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Basic Details State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Location State
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');

  // Purpose State
  const [purpose, setPurpose] = useState('');
  const [specialistType, setSpecialistType] = useState('General Practitioner');

  // Payment State
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingZip, setBillingZip] = useState('');

  // Specialist options
  const specialistTypes = [
    { label: 'General Practitioner', value: 'General Practitioner' },
    { label: 'Cardiologist', value: 'Cardiologist' },
    { label: 'Dermatologist', value: 'Dermatologist' },
    { label: 'Neurologist', value: 'Neurologist' },
    { label: 'Orthopedist', value: 'Orthopedist' },
    { label: 'Pediatrician', value: 'Pediatrician' },
    { label: 'Psychiatrist', value: 'Psychiatrist' },
    { label: 'Gynecologist', value: 'Gynecologist' },
    { label: 'Ophthalmologist', value: 'Ophthalmologist' },
    { label: 'ENT Specialist', value: 'ENT Specialist' }
  ];

  // Specialist descriptions
  const specialistDescriptions: { [key: string]: string } = {
    'General Practitioner': 'Primary care for general health concerns',
    'Cardiologist': 'Heart and cardiovascular health',
    'Dermatologist': 'Skin, hair, and nail conditions',
    'Neurologist': 'Brain and nervous system disorders',
    'Orthopedist': 'Bones, joints, and musculoskeletal issues',
    'Pediatrician': 'Medical care for children and infants',
    'Psychiatrist': 'Mental health and psychiatric care',
    'Gynecologist': 'Women\'s reproductive health',
    'Ophthalmologist': 'Eye and vision care',
    'ENT Specialist': 'Ear, nose, and throat conditions'
  };

  // Specialist pricing (per consultation)
  const specialistPricing: { [key: string]: number } = {
    'General Practitioner': 75,
    'Cardiologist': 150,
    'Dermatologist': 120,
    'Neurologist': 160,
    'Orthopedist': 140,
    'Pediatrician': 90,
    'Psychiatrist': 130,
    'Gynecologist': 110,
    'Ophthalmologist': 100,
    'ENT Specialist': 95
  };

  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is needed to get your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      // Reverse geocode to get city and province
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode.length > 0) {
        setCity(reverseGeocode[0].city || '');
        setProvince(reverseGeocode[0].region || '');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not get your current location.');
    }
  };

  const handleCall = () => {
    // Validation
    if (!firstName || !lastName || !dateOfBirth) {
      Alert.alert('Missing Information', 'Please fill in all basic details.');
      return;
    }
    if (!city || !province) {
      Alert.alert('Missing Information', 'Please provide your location.');
      return;
    }
    if (!purpose || !specialistType) {
      Alert.alert('Missing Information', 'Please provide purpose and select a specialist.');
      return;
    }

    if (!cardNumber || !expiryDate || !cvv || !cardName || !billingAddress || !billingZip) {
      Alert.alert('Missing Information', 'Please complete the payment section.');
      return;
    }

    // Here you would process payment and initiate the call
    Alert.alert(
      'Call Initiated', 
      `Connecting you with a ${specialistType}...`
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.pageTitle}>
          Connect with a healthcare provider
        </Text>
      </View>

      {/* Section 1: Basic Details - All in one row */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionRow}>
        <Text style={[styles.sectionLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
          Basic
        </Text>
        <TextInput
          style={[
            styles.smallInput,
            { 
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              color: Colors[colorScheme ?? 'light'].text,
              borderColor: isDark ? '#444' : '#ddd'
            }
          ]}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First Name"
          placeholderTextColor={isDark ? '#666' : '#999'}
        />
        <TextInput
          style={[
            styles.smallInput,
            { 
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              color: Colors[colorScheme ?? 'light'].text,
              borderColor: isDark ? '#444' : '#ddd'
            }
          ]}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last Name"
          placeholderTextColor={isDark ? '#666' : '#999'}
        />
        <TextInput
          style={[
            styles.smallInput,
            { 
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              color: Colors[colorScheme ?? 'light'].text,
              borderColor: isDark ? '#444' : '#ddd'
            }
          ]}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="DOB"
          placeholderTextColor={isDark ? '#666' : '#999'}
        />
        </View>
      </View>

      {/* Section Separator */}
      <View style={styles.sectionSeparator} />

      {/* Section 2: Location - All in one row */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionRow}>
        <Text style={[styles.sectionLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
          Location
        </Text>
        <TextInput
          style={[
            styles.smallInput,
            { 
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              color: Colors[colorScheme ?? 'light'].text,
              borderColor: isDark ? '#444' : '#ddd'
            }
          ]}
          value={city}
          onChangeText={setCity}
          placeholder="City"
          placeholderTextColor={isDark ? '#666' : '#999'}
        />
        <TextInput
          style={[
            styles.smallInput,
            { 
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              color: Colors[colorScheme ?? 'light'].text,
              borderColor: isDark ? '#444' : '#ddd'
            }
          ]}
          value={province}
          onChangeText={setProvince}
          placeholder="Province"
          placeholderTextColor={isDark ? '#666' : '#999'}
        />
        <Pressable
          style={styles.smallButton}
          onPress={handleGetCurrentLocation}
        >
            <Text style={styles.smallButtonText}>📍 Get Location</Text>
        </Pressable>
        </View>
      </View>

      {/* Section Separator */}
      <View style={styles.sectionSeparator} />

      {/* Section 3: Purpose - All in one row */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionRow}>
        <Text style={[styles.sectionLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
          Purpose
        </Text>
        <TextInput
          style={[
            styles.mediumInput,
            { 
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              color: Colors[colorScheme ?? 'light'].text,
              borderColor: isDark ? '#444' : '#ddd'
            }
          ]}
          value={purpose}
          onChangeText={setPurpose}
          placeholder="Describe issue"
          placeholderTextColor={isDark ? '#666' : '#999'}
          multiline={false}
        />
        <Dropdown
          style={[
            styles.smallDropdown,
            { 
              backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
              borderColor: isDark ? '#444' : '#ddd'
            }
          ]}
          data={specialistTypes}
          search={true}
          searchPlaceholder="Search specialist..."
          maxHeight={300}
          labelField="label"
          valueField="value"
          placeholder="Specialist"
          value={specialistType}
          onChange={(item: any) => setSpecialistType(item.value)}
          placeholderStyle={{ color: isDark ? '#666' : '#999', fontSize: 13 }}
          selectedTextStyle={{ color: Colors[colorScheme ?? 'light'].text, fontSize: 13 }}
          itemTextStyle={{ color: Colors[colorScheme ?? 'light'].text, fontSize: 13 }}
          inputSearchStyle={{
            backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
            color: Colors[colorScheme ?? 'light'].text,
            borderColor: isDark ? '#444' : '#ddd'
          }}
          containerStyle={[
            styles.dropdownContainer,
            {
              backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
              borderColor: isDark ? '#444' : '#ddd',
              borderRadius: 6,
              marginTop: 4
            }
          ]}
          itemContainerStyle={{
            paddingVertical: 0,
            height: 36,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#3a3a3a' : '#f0f0f0',
            justifyContent: 'center'
          }}
          activeColor={isDark ? '#3a3a3a' : '#f0f0f0'}
        />
        </View>
      </View>
      {specialistType && (
        <View style={styles.descriptionRow}>
          <View style={{ width: 70, marginRight: 8 }} />
          <Text style={[styles.specialistDescription, styles.descriptionText, { color: Colors[colorScheme ?? 'light'].text }]}>
            {specialistType}: {specialistDescriptions[specialistType]}
          </Text>
        </View>
      )}

      {/* Section Separator */}
      <View style={styles.sectionSeparator} />

      {/* Section 4: Payment */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionLabel, { color: Colors[colorScheme ?? 'light'].text }]}>
            Payment
          </Text>
          <TextInput
            style={[
              styles.mediumInput,
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: isDark ? '#444' : '#ddd'
              }
            ]}
            value={cardName}
            onChangeText={setCardName}
            placeholder="Name on Card"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
        </View>
        
        <View style={[styles.sectionRow, styles.paymentRowSpacing]}>
          <View style={{ width: 70, marginRight: 8 }} />
          <TextInput
            style={[
              styles.smallInput,
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: isDark ? '#444' : '#ddd'
              }
            ]}
            value={cardNumber}
            onChangeText={setCardNumber}
            placeholder="Card Number"
            placeholderTextColor={isDark ? '#666' : '#999'}
            keyboardType="numeric"
          />
          <TextInput
            style={[
              styles.smallInput,
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: isDark ? '#444' : '#ddd'
              }
            ]}
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="MM/YY"
            placeholderTextColor={isDark ? '#666' : '#999'}
            keyboardType="numeric"
          />
          <TextInput
            style={[
              styles.smallInput,
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: isDark ? '#444' : '#ddd'
              }
            ]}
            value={cvv}
            onChangeText={setCvv}
            placeholder="CVV"
            placeholderTextColor={isDark ? '#666' : '#999'}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.sectionRow, styles.paymentRowSpacing]}>
          <View style={{ width: 70, marginRight: 8 }} />
          <TextInput
            style={[
              styles.mediumInput,
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: isDark ? '#444' : '#ddd'
              }
            ]}
            value={billingAddress}
            onChangeText={setBillingAddress}
            placeholder="Billing Address"
            placeholderTextColor={isDark ? '#666' : '#999'}
          />
          <TextInput
            style={[
              styles.smallInput,
              { 
                backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
                color: Colors[colorScheme ?? 'light'].text,
                borderColor: isDark ? '#444' : '#ddd'
              }
            ]}
            value={billingZip}
            onChangeText={setBillingZip}
            placeholder="ZIP"
            placeholderTextColor={isDark ? '#666' : '#999'}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Section Separator */}
      <View style={styles.sectionSeparator} />

      {/* Call Button */}
      <View style={styles.callRow}>
        <View style={styles.leftPriceSection}>
          <View style={styles.priceContainer}>
            <Text style={[styles.dollarSign, { color: Colors[colorScheme ?? 'light'].text }]}>
              $
            </Text>
            <Text style={[styles.priceNumber, { color: Colors[colorScheme ?? 'light'].text }]}>
              {specialistPricing[specialistType]}
            </Text>
            <Text style={[styles.pricePer, { color: Colors[colorScheme ?? 'light'].text }]}>
              {" / 30 min"}
            </Text>
          </View>
          <Text style={[styles.specialistName, { color: isDark ? '#888' : '#666' }]}>
            {specialistType}
          </Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={[styles.waitTime, { color: Colors[colorScheme ?? 'light'].text }]}>
            ~5 min wait time
          </Text>
          <Pressable
            style={styles.callButton}
            onPress={handleCall}
          >
            <Text style={styles.callButtonText}>Call Now</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    marginBottom: 30,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    color: '#666666',
  },
  sectionContainer: {
    alignItems: 'stretch',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 70,
    marginRight: 8,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 20,
  },
  smallInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    minHeight: 36,
  },
  mediumInput: {
    flex: 2,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    minHeight: 36,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#e3f2fd',
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1976d2',
  },
  smallDropdown: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    minHeight: 36,
  },
  smallDropdownText: {
    fontSize: 13,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 6,
    maxHeight: 150,
    minWidth: 200,
    zIndex: 1000,
    elevation: 10,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 13,
  },
  paymentInfo: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  buttonGroup: {
    alignItems: 'flex-end',
    gap: 8,
  },
  callButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 180,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'red',
  },
  leftPriceSection: {
    gap: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dollarSign: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    marginRight: 2,
  },
  priceNumber: {
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 32,
  },
  pricePer: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 8,
    marginLeft: 4,
    opacity: 0.7,
  },
  specialistName: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waitTime: {
    fontSize: 13,
    opacity: 0.7,
  },
  bottomSpacer: {
    height: 20,
  },
  paywallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  paywallContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  paywallSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  priceBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  priceDescription: {
    fontSize: 13,
    color: '#666',
  },
  payButton: {
    backgroundColor: '#FFE5E5',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 6,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    color: 'red',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  specialistDescription: {
    fontSize: 12,
    opacity: 0.7,
    flex: 2,
  },
  descriptionText: {
    paddingLeft: 12,
  },
  paymentRowSpacing: {
    marginTop: 12,
  },
  dropdownContainer: {
    borderRadius: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
