import type { ConfirmSignUpInput, ResendSignUpCodeInput, SignInInput, SignUpInput } from 'aws-amplify/auth';
import { confirmSignUp, getCurrentUser, resendSignUpCode, signIn, signOut, signUp } from 'aws-amplify/auth';

/**
 * Centralized authentication service
 * Provides type-safe auth operations with proper error handling
 */

export interface AuthError extends Error {
  name: string;
  code?: string;
  message: string;
}

/**
 * Sign up a new user
 * Returns success status and whether verification is needed
 */
export async function handleSignUp(
  email: string,
  password: string
): Promise<{ success: boolean; needsVerification?: boolean; error?: AuthError }> {
  try {
    const signUpInput: SignUpInput = {
      username: email,
      password,
      options: {
        userAttributes: {
          email,
        },
        autoSignIn: {
          enabled: false,
        },
      },
    };

    const { nextStep } = await signUp(signUpInput);
    
    // Check if verification is required
    // In Amplify v6, CONFIRM_SIGN_UP step indicates verification is needed
    const needsVerification = nextStep.signUpStep === 'CONFIRM_SIGN_UP';
    
    return { success: true, needsVerification };
  } catch (error) {
    return {
      success: false,
      error: error as AuthError,
    };
  }
}

/**
 * Sign in an existing user
 */
export async function handleSignIn(email: string, password: string): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const signInInput: SignInInput = {
      username: email,
      password,
    };

    await signIn(signInInput);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error as AuthError,
    };
  }
}

/**
 * Confirm sign up with verification code
 */
export async function handleConfirmSignUp(
  email: string,
  confirmationCode: string
): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const confirmSignUpInput: ConfirmSignUpInput = {
      username: email,
      confirmationCode,
    };

    await confirmSignUp(confirmSignUpInput);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error as AuthError,
    };
  }
}

/**
 * Resend verification code
 */
export async function handleResendCode(email: string): Promise<{ success: boolean; error?: AuthError }> {
  try {
    const resendSignUpCodeInput: ResendSignUpCodeInput = {
      username: email,
    };

    await resendSignUpCode(resendSignUpCodeInput);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error as AuthError,
    };
  }
}

/**
 * Sign out current user
 */
export async function handleSignOut(): Promise<{ success: boolean; error?: AuthError }> {
  try {
    await signOut();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error as AuthError,
    };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentAuthUser() {
  try {
    const user = await getCurrentUser();
    return { user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
}

/**
 * Helper function to get user-friendly error messages
 */
export function getAuthErrorMessage(error: AuthError): string {
  if (!error) return 'An unexpected error occurred';

  switch (error.name || error.code) {
    case 'NotAuthorizedException':
      return 'Incorrect email or password';
    case 'UserNotConfirmedException':
      return 'Please verify your email address';
    case 'UsernameExistsException':
      return 'An account with this email already exists';
    case 'CodeMismatchException':
      return 'Invalid verification code';
    case 'ExpiredCodeException':
      return 'Verification code has expired. Please request a new one';
    case 'LimitExceededException':
      return 'Too many attempts. Please try again later';
    case 'InvalidPasswordException':
      return 'Password does not meet requirements';
    case 'InvalidParameterException':
      return error.message || 'Invalid input provided';
    default:
      return error.message || 'An error occurred during authentication';
  }
}

