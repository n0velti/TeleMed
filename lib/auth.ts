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
  password: string,
  options?: {
    isSpecialist?: boolean;
    givenName?: string;
    familyName?: string;
    phoneNumber?: string;
    birthdate?: string;
  }
): Promise<{ success: boolean; needsVerification?: boolean; error?: AuthError }> {
  try {
    console.log('[AUTH] Starting sign up for:', email);
    const userAttributes: Record<string, string> = { email };
    
    // TODO: Add these attributes after redeploying sandbox
    // The sandbox was deployed before these attributes were added to the schema
    // if (options?.givenName?.trim()) {
    //   userAttributes.givenName = options.givenName.trim();
    // }
    // if (options?.familyName?.trim()) {
    //   userAttributes.familyName = options.familyName.trim();
    // }
    // if (options?.phoneNumber?.trim()) {
    //   userAttributes.phoneNumber = options.phoneNumber.trim();
    // }
    // if (options?.birthdate?.trim()) {
    //   userAttributes.birthdate = options.birthdate.trim();
    // }

    console.log('[AUTH] User attributes:', userAttributes);
    console.log('[AUTH] Has specialist flag:', options?.isSpecialist);

    // Add all optional data to clientMetadata so Lambda trigger can access it
    const clientMetadata: Record<string, string> = {};
    if (options?.isSpecialist) {
      clientMetadata.isSpecialist = 'true';
    }
    if (options?.givenName?.trim()) {
      clientMetadata.givenName = options.givenName.trim();
    }
    if (options?.familyName?.trim()) {
      clientMetadata.familyName = options.familyName.trim();
    }
    if (options?.phoneNumber?.trim()) {
      clientMetadata.phoneNumber = options.phoneNumber.trim();
    }
    if (options?.birthdate?.trim()) {
      clientMetadata.birthdate = options.birthdate.trim();
    }

    console.log('[AUTH] Client metadata:', clientMetadata);

    const signUpInput: SignUpInput = {
      username: email,
      password,
      options: {
        userAttributes,
        autoSignIn: {
          enabled: false,
        },
        clientMetadata,
      },
    };

    console.log('[AUTH] SignUpInput prepared, calling signUp...');
    console.log('[AUTH] Full SignUpInput:', JSON.stringify({
      username: signUpInput.username,
      options: {
        userAttributes: signUpInput.options.userAttributes,
        clientMetadata: signUpInput.options.clientMetadata,
        autoSignIn: signUpInput.options.autoSignIn
      }
    }, null, 2));
    const { nextStep } = await signUp(signUpInput);
    console.log('[AUTH] Sign up successful! Next step:', nextStep.signUpStep);
    
    // Check if verification is required
    // In Amplify v6, CONFIRM_SIGN_UP step indicates verification is needed
    const needsVerification = nextStep.signUpStep === 'CONFIRM_SIGN_UP';
    console.log('[AUTH] Needs verification:', needsVerification);
    
    return { success: true, needsVerification };
  } catch (error: any) {
    console.error('[AUTH] Sign up error:', error);
    console.error('[AUTH] Error name:', error?.name);
    console.error('[AUTH] Error code:', error?.code);
    console.error('[AUTH] Error message:', error?.message);
    console.error('[AUTH] Full error:', JSON.stringify(error, null, 2));
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

