import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  handleConfirmSignUp as authConfirmSignUp,
  handleResendCode as authResendCode,
  handleSignIn as authSignIn,
  handleSignUp as authSignUp,
  getAuthErrorMessage,
} from '@/lib/auth';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AccountScreen() {
  const colorScheme = useColorScheme();
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authSignIn(email.trim(), password);
      if (result.success) {
        await refreshAuth();
        Alert.alert('Success', 'Login successful!');
        // Reset form
        setEmail('');
        setPassword('');
      } else {
        Alert.alert('Error', getAuthErrorMessage(result.error!));
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Basic password validation
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authSignUp(email.trim(), password);
      if (result.success) {
        // Always show verification screen after successful sign up
        // AWS Cognito will send the verification code via email
        setShowVerification(true);
        // Don't show alert if verification is required (expected behavior)
        // The verification screen message will inform the user
      } else {
        Alert.alert('Error', getAuthErrorMessage(result.error!));
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
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
      const result = await authConfirmSignUp(email.trim(), verificationCode.trim());
      if (result.success) {
        Alert.alert('Success', 'Account verified successfully!');
        // Reset form and go back to login
        setShowVerification(false);
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setVerificationCode('');
      } else {
        Alert.alert('Error', getAuthErrorMessage(result.error!));
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
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

  const handleGoogleLogin = () => {
    Alert.alert('Google Login', 'Google login will be implemented here');
  };

  const handleAppleLogin = () => {
    Alert.alert('Apple Login', 'Apple login will be implemented here');
  };

  const handleFacebookLogin = () => {
    Alert.alert('Facebook Login', 'Facebook login will be implemented here');
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowVerification(false);
    setVerificationCode('');
  };

  const handleBackToSignUp = () => {
    setShowVerification(false);
    setVerificationCode('');
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
      <View style={styles.formContainer}>
        <Text style={[styles.title, { color: Colors[colorScheme ?? 'light'].text }]}>
          {showVerification ? 'Verify Your Email' : isSignUp ? 'Create Account' : 'Welcome Back'}
        </Text>
        
        {showVerification ? (
          // Verification Code Form
          <View style={styles.form}>
            <Text style={[styles.verificationText, { color: Colors[colorScheme ?? 'light'].text }]}>
              We've sent a verification code to {email}
            </Text>

            <TextInput
              style={[styles.input, styles.verificationInput, { backgroundColor: '#F9F9F9', borderColor: '#E0E0E0', color: Colors[colorScheme ?? 'light'].text }]}
              placeholder="Enter verification code"
              placeholderTextColor="#999"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
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
              style={[
                styles.resendButton,
                { pointerEvents: isLoading ? 'none' : 'auto' }
              ]} 
              onPress={handleResendCode}
              disabled={isLoading}
            >
              <Text style={styles.resendButtonText}>Didn't receive a code? Resend</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToSignUp}>
              <Text style={styles.secondaryButtonText}>Back to Sign Up</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Login/Sign Up Form
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: '#F9F9F9', borderColor: '#E0E0E0', color: Colors[colorScheme ?? 'light'].text }]}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextInput
              style={[styles.input, { backgroundColor: '#F9F9F9', borderColor: '#E0E0E0', color: Colors[colorScheme ?? 'light'].text }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {isSignUp && (
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { backgroundColor: '#F9F9F9', borderColor: '#E0E0E0', color: Colors[colorScheme ?? 'light'].text }]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <View style={styles.checkmarkContainer}>
                  {confirmPassword.length > 0 && (
                    <>
                      <TouchableOpacity
                        onPressIn={() => setShowTooltip(true)}
                        onPressOut={() => setShowTooltip(false)}
                        activeOpacity={1}
                      >
                        <Text style={[
                          styles.checkmark,
                          { color: password && confirmPassword && password === confirmPassword ? '#4CAF50' : '#E0E0E0' }
                        ]}>
                          ✓
                        </Text>
                      </TouchableOpacity>
                      {showTooltip && password && confirmPassword && password === confirmPassword && (
                        <View style={styles.tooltip}>
                          <Text style={styles.tooltipText}>Passwords match</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotButton}>
                <Text style={styles.forgotButtonText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[
                styles.loginButton, 
                isLoading && styles.loginButtonDisabled,
                { pointerEvents: isLoading ? 'none' : 'auto' }
              ]} 
              onPress={isSignUp ? handleSignUp : handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginButtonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
              <Text style={styles.socialButtonText}>🔍 Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleAppleLogin}>
              <Text style={styles.socialButtonText}>🍎 Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
              <Text style={styles.socialButtonText}>📘 Continue with Facebook</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={toggleMode}>
              <Text style={styles.secondaryButtonText}>
                {isSignUp ? 'Already have an account? Sign In' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            {!isSignUp && (
              <TouchableOpacity style={styles.specialistButton}>
                <Text style={styles.specialistButtonText}>I'm a specialist</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    width: 350,
    maxWidth: '90%',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 28,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 11,
    fontSize: 14,
    marginBottom: 12,
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    marginBottom: 0,
  },
  checkmarkContainer: {
    position: 'absolute',
    right: -35,
    top: 0,
    bottom: 0,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tooltip: {
    position: 'absolute',
    top: -35,
    right: -10,
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  verificationText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 20,
  },
  verificationInput: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: 20,
  },
  forgotButton: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotButtonText: {
    color: '#666',
    fontSize: 13,
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
  loginButton: {
    backgroundColor: 'black',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
  },
  socialButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  specialistButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  specialistButtonText: {
    color: '#666',
    fontSize: 13,
  },
});
