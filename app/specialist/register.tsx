import type { Schema } from '@/amplify/data/resource';
import { StaticSidebar } from '@/components/static-sidebar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  handleConfirmSignUp as authConfirmSignUp,
  handleResendCode as authResendCode,
  handleSignIn as authSignIn,
  handleSignUp as authSignUp,
  getAuthErrorMessage,
  getCurrentAuthUser,
} from '@/lib/auth';
import { generateClient } from 'aws-amplify/data';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

const client = generateClient<Schema>();

export default function SpecialistRegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { refreshAuth } = useAuth();

  // Identity
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [govIdUrl, setGovIdUrl] = useState('');
  
  // Verification
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  // License
  const [licenseNumber, setLicenseNumber] = useState('');
  const [province, setProvince] = useState('ON');
  const [issuingBody, setIssuingBody] = useState('CPSO');

  // Profile
  const [specializationName, setSpecializationName] = useState('Family Medicine');
  const [subSpecialization, setSubSpecialization] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [educationInstitution, setEducationInstitution] = useState('');
  const [educationDegree, setEducationDegree] = useState('');
  const [educationStartYear, setEducationStartYear] = useState('');
  const [educationEndYear, setEducationEndYear] = useState('');
  const [languages, setLanguages] = useState('English');
  const [telehealthExperience, setTelehealthExperience] = useState('Yes');
  const [practiceType, setPracticeType] = useState('Private');
  const [insurancePlan, setInsurancePlan] = useState('OHIP');

  // Account
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Compliance
  const [acceptTos, setAcceptTos] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const provinces = [
    { label: 'Ontario (ON)', value: 'ON' },
    { label: 'British Columbia (BC)', value: 'BC' },
    { label: 'Alberta (AB)', value: 'AB' },
    { label: 'Quebec (QC)', value: 'QC' },
    { label: 'Manitoba (MB)', value: 'MB' },
    { label: 'Saskatchewan (SK)', value: 'SK' },
    { label: 'Nova Scotia (NS)', value: 'NS' },
    { label: 'New Brunswick (NB)', value: 'NB' },
    { label: 'Newfoundland and Labrador (NL)', value: 'NL' },
    { label: 'Prince Edward Island (PE)', value: 'PE' },
    { label: 'Northwest Territories (NT)', value: 'NT' },
    { label: 'Yukon (YT)', value: 'YT' },
    { label: 'Nunavut (NU)', value: 'NU' },
  ];

  // Simple province -> school suggestion map (can be expanded later)
  const provinceToSchool: Record<string, string> = {
    ON: 'University of Toronto Faculty of Medicine',
    BC: 'University of British Columbia Faculty of Medicine',
    AB: 'Cumming School of Medicine (University of Calgary)',
    QC: 'McGill Faculty of Medicine and Health Sciences',
    MB: 'Max Rady College of Medicine (University of Manitoba)',
    SK: 'College of Medicine (University of Saskatchewan)',
    NS: 'Dalhousie University Faculty of Medicine',
    NB: 'Dalhousie Medicine New Brunswick',
    NL: 'Faculty of Medicine (Memorial University of Newfoundland)',
    PE: 'Dalhousie Medicine PEI',
    NT: 'Northern/Out-of-Province Program',
    YT: 'Northern/Out-of-Province Program',
    NU: 'Northern/Out-of-Province Program',
  };

  const canSubmit = useMemo(() => {
    return (
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      licenseNumber.trim() &&
      issuingBody.trim() &&
      province.trim() &&
      password.length >= 8 &&
      password === confirmPassword &&
      acceptTos &&
      acceptPrivacy
    );
  }, [firstName, lastName, email, licenseNumber, issuingBody, province, password, confirmPassword, acceptTos, acceptPrivacy]);

  const onSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Missing information', 'Please complete required fields and accept policies.');
      return;
    }

    console.log('[REGISTER] Starting registration submission');
    console.log('[REGISTER] Form data:', {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      dob: dob.trim(),
      hasPassword: !!password
    });
    
    setIsLoading(true);
    try {
      // Step 1: Create Cognito user account with specialist flag
      console.log('[REGISTER] Calling authSignUp...');
      const signup = await authSignUp(email.trim(), password, {
        isSpecialist: true,
        givenName: firstName.trim(),
        familyName: lastName.trim(),
        phoneNumber: phone.trim() || undefined,
        birthdate: dob.trim() || undefined,
      });

      console.log('[REGISTER] Sign up result:', signup);

      if (!signup.success) {
        console.error('[REGISTER] Sign up failed:', signup.error);
        Alert.alert('Sign up failed', getAuthErrorMessage(signup.error!));
        setIsLoading(false);
        return;
      }

      console.log('[REGISTER] Sign up successful, showing verification screen');
      // Store password temporarily for auto sign-in after verification
      setTempPassword(password);
      
      // Show verification screen
      setShowVerification(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('[REGISTER] Exception caught:', err);
      Alert.alert('Error', err?.message || 'Failed to submit registration');
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      // Step 2: Verify email code
      const confirmResult = await authConfirmSignUp(email.trim(), verificationCode.trim());
      if (!confirmResult.success) {
        Alert.alert('Error', getAuthErrorMessage(confirmResult.error!));
        return;
      }

      // Step 3: Automatically sign in after verification
      const signInResult = await authSignIn(email.trim(), tempPassword);
      if (!signInResult.success) {
        Alert.alert('Verification Successful', 'Your email has been verified. Please sign in.');
        setShowVerification(false);
        return;
      }

      // Step 4: Create specialist profile and related records
      await createSpecialistProfile();

      // Refresh auth state
      await refreshAuth();

      // Navigate to tabs
      requestAnimationFrame(() => {
        router.replace('/(tabs)');
      });
    } catch (error) {
      console.error('[REGISTER] Error in verification flow:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createSpecialistProfile = async () => {
    // Get the current user ID (Cognito sub)
    const authUser = await getCurrentAuthUser();
    if (!authUser.user?.userId) {
      throw new Error('Unable to get user ID');
    }
    const userId = authUser.user.userId;
    
    console.log('[REGISTER] Creating specialist with userId:', userId);
    
    // 1) Create Specialist
    const specialistResult = await client.models.Specialist.create({
      user_id: userId, // Link to User.id (Cognito sub)
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      date_of_birth: dob || undefined,
      photo_url: photoUrl || undefined,
      government_id_url: govIdUrl || undefined,
      status: 'pending',
    });

    const specialistId = specialistResult.data?.id;
    if (!specialistId) throw new Error('Failed to create specialist');

    // 2) Upsert Specialization (MVP: create if not exists by name)
    let specializationId: string | undefined;
    const existing = await client.models.Specialization.list({
      filter: { name: { eq: specializationName } },
      limit: 1,
    });
    if (existing.data && existing.data.length > 0) {
      specializationId = existing.data[0].id;
    } else {
      const newSpec = await client.models.Specialization.create({
        name: specializationName,
        description: subSpecialization || undefined,
        category: 'Physician',
        telehealth_suitable: true,
      });
      specializationId = newSpec.data?.id;
    }

    if (specializationId) {
      await client.models.SpecialistSpecialization.create({
        specialist_id: specialistId,
        specialization_id: specializationId,
      });
    }

    // 3) License
    await client.models.License.create({
      specialist_id: specialistId,
      license_number: licenseNumber.trim(),
      province: province.trim(),
      issuing_body: issuingBody.trim(),
    });

    // 4) Education (optional)
    if (educationInstitution && educationDegree) {
      await client.models.Education.create({
        specialist_id: specialistId,
        institution: educationInstitution.trim(),
        degree: educationDegree.trim(),
        start_year: educationStartYear ? parseInt(educationStartYear, 10) : undefined,
        end_year: educationEndYear ? parseInt(educationEndYear, 10) : undefined,
      });
    }

    // 5) Insurance (optional)
    if (insurancePlan) {
      await client.models.InsuranceAccepted.create({
        specialist_id: specialistId,
        plan_name: insurancePlan,
        province,
      });
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const result = await authResendCode(email.trim());
      if (result.success) {
        Alert.alert('Code Resent', `A new verification code has been sent to ${email.trim()}`);
      } else {
        Alert.alert('Error', getAuthErrorMessage(result.error!));
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onProvinceChange = (value: string) => {
    setProvince(value);
    const suggested = provinceToSchool[value];
    if (suggested) setEducationInstitution(suggested);
    // Update issuing body defaults for convenience
    if (value === 'ON') setIssuingBody('CPSO');
    else if (value === 'BC') setIssuingBody('CPSBC');
    else if (value === 'AB') setIssuingBody('CPSA');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.leftSidebar}>
        <StaticSidebar />
      </View>
      <View style={styles.formContainer}>
        <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
          {showVerification ? 'Verify Your Email' : 'Specialist Registration'}
        </Text>

      <ScrollView style={{ width: '100%', maxWidth: 1100 }} contentContainerStyle={{ alignItems: 'stretch', paddingBottom: 24, alignSelf: 'center' }}>
      
      {showVerification ? (
        // Verification Code Form
        <Section title="Email Verification" colorScheme={colorScheme}>
          <Text style={[styles.verificationText, { color: Colors[colorScheme ?? 'light'].text }]}>
            We've sent a verification code to {email}
          </Text>
          
          <Input
            placeholder="Enter verification code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            maxLength={6}
            colorScheme={colorScheme}
          />

          <TouchableOpacity
            style={[
              styles.loginButton,
              isLoading && styles.loginButtonDisabled,
              { pointerEvents: isLoading ? 'none' : 'auto' }
            ]}
            onPress={handleVerifyCode}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resendButton, { pointerEvents: isLoading ? 'none' : 'auto' }]}
            onPress={handleResendCode}
            disabled={isLoading}
          >
            <Text style={styles.resendButtonText}>Didn't receive a code? Resend</Text>
          </TouchableOpacity>
        </Section>
      ) : (
        // Registration Form
        <>
        <Section title="Identity" colorScheme={colorScheme}>
        <Row>
          <Input placeholder="First name*" value={firstName} onChangeText={setFirstName} colorScheme={colorScheme} />
          <Input placeholder="Last name*" value={lastName} onChangeText={setLastName} colorScheme={colorScheme} />
        </Row>
        <Row>
          <Input placeholder="Email*" value={email} onChangeText={setEmail} keyboardType="email-address" colorScheme={colorScheme} />
          <Input placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" colorScheme={colorScheme} />
        </Row>
        <Row>
          <Input placeholder="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} colorScheme={colorScheme} />
        </Row>
        <Row>
          <Input placeholder="Photo URL" value={photoUrl} onChangeText={setPhotoUrl} colorScheme={colorScheme} />
          <Input placeholder="Government ID URL" value={govIdUrl} onChangeText={setGovIdUrl} colorScheme={colorScheme} />
        </Row>
      </Section>

      {/* License */}
      <Section title="License" colorScheme={colorScheme}>
        <Row>
          <Input placeholder="License number*" value={licenseNumber} onChangeText={setLicenseNumber} colorScheme={colorScheme} />
          <View style={{ flex: 1 }}>
            <Dropdown
              style={[
                styles.dropdown,
                { 
                  backgroundColor: isDark ? '#2a2a2a' : '#F9F9F9',
                  borderColor: '#E0E0E0',
                }
              ]}
              data={provinces}
              labelField="label"
              valueField="value"
              placeholder="Province*"
              search
              searchPlaceholder="Search province..."
              value={province}
              onChange={(item: any) => onProvinceChange(item.value)}
              placeholderStyle={{ color: '#999', fontSize: 13 }}
              selectedTextStyle={{ color: Colors[colorScheme ?? 'light'].text, fontSize: 14 }}
              itemTextStyle={{ color: Colors[colorScheme ?? 'light'].text, fontSize: 14 }}
              inputSearchStyle={{ backgroundColor: isDark ? '#2a2a2a' : '#F9F9F9', color: Colors[colorScheme ?? 'light'].text }}
              containerStyle={[styles.dropdownContainer]}
            />
          </View>
        </Row>
        <Row>
          <Input placeholder="Issuing body (e.g., CPSO)*" value={issuingBody} onChangeText={setIssuingBody} colorScheme={colorScheme} />
        </Row>
      </Section>

      {/* Profile */}
      <Section title="Professional Profile" colorScheme={colorScheme}>
        <Row>
          <Input placeholder="Specialization*" value={specializationName} onChangeText={setSpecializationName} colorScheme={colorScheme} />
          <Input placeholder="Sub-specialization" value={subSpecialization} onChangeText={setSubSpecialization} colorScheme={colorScheme} />
        </Row>
        <Row>
          <Input placeholder="Years of experience" value={yearsExperience} onChangeText={setYearsExperience} keyboardType="number-pad" colorScheme={colorScheme} />
          <Input placeholder="Languages (comma-separated)" value={languages} onChangeText={setLanguages} colorScheme={colorScheme} />
        </Row>
        <Row>
          <Input placeholder="Practice type" value={practiceType} onChangeText={setPracticeType} colorScheme={colorScheme} />
          <Input placeholder="Insurance plan (e.g., OHIP)" value={insurancePlan} onChangeText={setInsurancePlan} colorScheme={colorScheme} />
        </Row>
        <Row>
          <Input placeholder="Education institution" value={educationInstitution} onChangeText={setEducationInstitution} colorScheme={colorScheme} />
          <Input placeholder="Degree (e.g., MD)" value={educationDegree} onChangeText={setEducationDegree} colorScheme={colorScheme} />
        </Row>
        <Row>
          <Input placeholder="Start year" value={educationStartYear} onChangeText={setEducationStartYear} keyboardType="number-pad" colorScheme={colorScheme} />
          <Input placeholder="End year" value={educationEndYear} onChangeText={setEducationEndYear} keyboardType="number-pad" colorScheme={colorScheme} />
        </Row>
      </Section>

      {/* Account */}
      <Section title="Account" colorScheme={colorScheme}>
        <Row>
          <Input placeholder="Password* (min 8 chars)" value={password} onChangeText={setPassword} colorScheme={colorScheme} secureTextEntry />
          <Input placeholder="Confirm Password*" value={confirmPassword} onChangeText={setConfirmPassword} colorScheme={colorScheme} secureTextEntry />
        </Row>
      </Section>

      {/* Compliance (checkbox-like MVP via tap-to-toggle) */}
      <Section title="Compliance" colorScheme={colorScheme}>
        <ToggleRow
          label="I agree to the Telemedicine Terms of Service"
          value={acceptTos}
          onToggle={() => setAcceptTos((v) => !v)}
          colorScheme={colorScheme}
        />
        <ToggleRow
          label="I consent to the Privacy Policy (PIPEDA/PHIPA compliant)"
          value={acceptPrivacy}
          onToggle={() => setAcceptPrivacy((v) => !v)}
          colorScheme={colorScheme}
        />
      </Section>

      <TouchableOpacity
        style={[
          styles.loginButton,
          (!canSubmit || isLoading) && styles.loginButtonDisabled,
          { pointerEvents: (!canSubmit || isLoading) ? 'none' : 'auto' }
        ]}
        onPress={onSubmit}
        disabled={!canSubmit || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.loginButtonText}>Submit Registration</Text>
        )}
      </TouchableOpacity>
      </>
      )}
      </ScrollView>
      </View>
    </View>
  );
}

function Section({ title, children, colorScheme }: { title: string; children: React.ReactNode; colorScheme: ReturnType<typeof useColorScheme> }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: Colors[colorScheme ?? 'light'].text }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Input({ colorScheme, ...props }: any) {
  const isDark = colorScheme === 'dark';
  return (
    <TextInput
      {...props}
      style={[
        styles.input,
        {
          backgroundColor: '#F9F9F9',
          color: Colors[colorScheme ?? 'light'].text,
          borderColor: '#E0E0E0',
        },
      ]}
      placeholderTextColor={isDark ? '#666' : '#999'}
    />
  );
}

function ToggleRow({ label, value, onToggle, colorScheme }: { label: string; value: boolean; onToggle: () => void; colorScheme: ReturnType<typeof useColorScheme> }) {
  return (
    <TouchableOpacity onPress={onToggle} style={styles.toggleRow}>
      <View style={[styles.checkbox, { backgroundColor: value ? '#0a7ea4' : 'transparent', borderColor: value ? '#0a7ea4' : '#bbb' }]} />
      <Text style={{ color: Colors[colorScheme ?? 'light'].text }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftSidebar: {
    width: 260,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: 'white',
    height: '100%',
    flexShrink: 0,
    minHeight: '100vh',
  },
  formContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 28,
    textAlign: 'center',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
  },
  loginButton: {
    backgroundColor: 'black',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  dropdownContainer: {
    backgroundColor: 'white',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 6,
  },
  verificationText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 20,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  resendButtonText: {
    color: '#666',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});


