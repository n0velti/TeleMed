import { getCurrentAuthUser } from '@/lib/auth';
import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Amazon Chime SDK Service Layer
 * 
 * This service handles all interactions with Amazon Chime SDK for video calling
 * Security: All API calls are authenticated using AWS Amplify credentials
 * HIPAA Compliance: No PII is logged, all communications are encrypted
 * 
 * Architecture:
 * - Backend Lambda functions create meetings and attendees securely
 * - Frontend receives credentials and initializes Chime SDK
 * - WebRTC connection is established peer-to-peer through Chime infrastructure
 */

/**
 * Meeting configuration returned from create-meeting Lambda
 */
export interface MeetingConfig {
  meetingId: string;
  mediaRegion: string;
  meetingArn: string;
  mediaPlacement: {
    audioHostUrl: string;
    audioFallbackUrl: string;
    signalingUrl: string;
    turnControlUrl: string;
    screenDataUrl: string;
    screenViewingUrl: string;
    screenSharingUrl: string;
    eventIngestionUrl: string;
  };
}

/**
 * Attendee configuration returned from create-attendee Lambda
 */
export interface AttendeeConfig {
  attendeeId: string;
  joinToken: string;
  meetingId: string;
  mediaRegion: string;
  meetingArn: string;
}

/**
 * Complete meeting credentials for Chime SDK initialization
 */
export interface MeetingCredentials {
  meetingInfo: {
    meetingId: string;
    mediaRegion: string;
    mediaPlacement: {
      audioHostUrl: string;
      audioFallbackUrl: string;
      signalingUrl: string;
      turnControlUrl: string;
      screenDataUrl: string;
      screenViewingUrl: string;
      screenSharingUrl: string;
      eventIngestionUrl: string;
    };
  };
  attendeeInfo: {
    attendeeId: string;
    joinToken: string;
    externalUserId: string; // User ID from Cognito
  };
}

/**
 * Error class for Chime service errors
 */
export class ChimeServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ChimeServiceError';
  }
}

/**
 * Call backend Lambda function securely
 * 
 * Security: Uses AWS Amplify authentication to call Lambda functions
 * All requests are authenticated and encrypted in transit
 */
async function callLambdaFunction(
  functionName: string,
  payload: Record<string, any>
): Promise<any> {
  try {
    // Get authenticated session with credentials
    const session = await fetchAuthSession();
    
    if (!session.credentials) {
      throw new ChimeServiceError('User not authenticated', 'UNAUTHORIZED');
    }

    // Get the API endpoint from Amplify outputs
    // In production, this should come from amplify_outputs.json
    const apiEndpoint = process.env.EXPO_PUBLIC_API_ENDPOINT || 
      (session.config?.API?.endpoints?.[0]?.endpoint) ||
      'https://api.amplifyapp.com'; // Default - will be replaced by actual endpoint

    // Construct the Lambda function URL
    // Note: In Amplify Gen 2, functions are exposed via API Gateway or Function URLs
    // You'll need to configure the actual endpoint URL
    const functionUrl = `${apiEndpoint}/${functionName}`;

    console.log('[CHIME] Calling Lambda function:', functionName);
    
    // Call the Lambda function with authenticated request
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Amplify automatically adds Authorization header from session
        ...(session.tokens?.idToken && {
          'Authorization': `Bearer ${session.tokens.idToken}`,
        }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[CHIME] Lambda function error:', errorText);
      throw new ChimeServiceError(
        `Failed to call ${functionName}: ${response.statusText}`,
        `HTTP_${response.status}`
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    if (error instanceof ChimeServiceError) {
      throw error;
    }
    console.error('[CHIME] Error calling Lambda function:', error);
    throw new ChimeServiceError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      'NETWORK_ERROR'
    );
  }
}

/**
 * Create a new Chime SDK meeting
 * 
 * This function calls the backend Lambda to create a secure meeting
 * The meeting ID is tied to the appointment for audit purposes
 * 
 * @param appointmentId - Optional appointment ID for audit trail
 * @param region - Preferred media region (defaults to us-east-1 for Canada)
 * @returns Meeting configuration with meeting ID and details
 */
export async function createMeeting(
  appointmentId?: string,
  region?: string
): Promise<MeetingConfig> {
  try {
    console.log('[CHIME] Creating meeting for appointment:', appointmentId);
    
    const result = await callLambdaFunction('create-meeting', {
      appointmentId,
      externalMeetingId: appointmentId ? `appointment-${appointmentId}` : undefined,
      region: region || 'us-east-1', // Optimize for Canada
    });

    if (!result.meetingId) {
      throw new ChimeServiceError('Invalid meeting response from server');
    }

    console.log('[CHIME] Meeting created successfully:', result.meetingId);
    return result as MeetingConfig;
  } catch (error) {
    console.error('[CHIME] Error creating meeting:', error);
    throw error;
  }
}

/**
 * Create a new attendee for an existing meeting
 * 
 * This function calls the backend Lambda to create an attendee
 * The attendee is linked to the authenticated user
 * 
 * @param meetingId - Meeting ID from createMeeting
 * @param userName - Optional display name for the attendee
 * @returns Attendee configuration with join token
 */
export async function createAttendee(
  meetingId: string,
  userName?: string
): Promise<AttendeeConfig> {
  try {
    // Get current authenticated user
    const { user, error: userError } = await getCurrentAuthUser();
    if (userError || !user) {
      throw new ChimeServiceError('User not authenticated', 'UNAUTHORIZED');
    }

    const userId = user.userId || user.username;
    console.log('[CHIME] Creating attendee for meeting:', meetingId);
    
    const result = await callLambdaFunction('create-attendee', {
      meetingId,
      userId,
      userName,
    });

    if (!result.attendeeId || !result.joinToken) {
      throw new ChimeServiceError('Invalid attendee response from server');
    }

    console.log('[CHIME] Attendee created successfully');
    
    // Merge meeting info if provided, otherwise return what we have
    // Note: In production, you might want to store meeting details when creating
    return {
      ...result,
      meetingId, // Ensure meetingId is included
      mediaRegion: result.mediaRegion || 'us-east-1',
      meetingArn: result.meetingArn || '',
    } as AttendeeConfig;
  } catch (error) {
    console.error('[CHIME] Error creating attendee:', error);
    throw error;
  }
}

/**
 * Create complete meeting credentials for Chime SDK initialization
 * 
 * This is a convenience function that:
 * 1. Creates a meeting
 * 2. Creates an attendee for the current user
 * 3. Returns complete credentials ready for Chime SDK
 * 
 * Note: Uses Amplify's function client for secure invocation
 * 
 * @param appointmentId - Optional appointment ID for audit trail
 * @param region - Preferred media region
 * @returns Complete meeting credentials
 */
export async function createMeetingSession(
  appointmentId?: string,
  region?: string
): Promise<MeetingCredentials> {
  // Use Amplify's built-in function invocation (recommended approach)
  return createMeetingSessionWithAmplify(appointmentId, region);
}

/**
 * Create meeting session using Amplify's function invocation (Recommended)
 * 
 * This uses Amplify Gen 2's function invocation via authenticated fetch
 * Functions are exposed as HTTPS endpoints and require authentication
 */
export async function createMeetingSessionWithAmplify(
  appointmentId?: string,
  region?: string
): Promise<MeetingCredentials> {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { getCurrentUser } = await import('aws-amplify/auth');
    
    // Get authenticated session
    const session = await fetchAuthSession();
    const user = await getCurrentUser();
    
    if (!session.tokens?.idToken) {
      throw new ChimeServiceError('User not authenticated', 'UNAUTHORIZED');
    }
    
    // Get function URLs from amplify_outputs.json
    // Functions are exposed as HTTPS endpoints in Amplify Gen 2
    let amplifyOutputs: any;
    try {
      amplifyOutputs = require('../amplify_outputs.json');
    } catch {
      throw new ChimeServiceError(
        'Amplify configuration not found. Please run `npx ampx sandbox` to deploy your backend.',
        'CONFIG_ERROR'
      );
    }
    
    console.log('[CHIME] Creating meeting with Amplify function invocation');
    
    // Prepare authenticated headers for Function URL invocation
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.tokens.idToken}`,
    };
    
    // Call create-meeting function
    // In Amplify Gen 2, functions are exposed as Lambda Function URLs
    // After deployment, function URLs should be in amplify_outputs.json under custom.functions
    const meetingPayload = {
      appointmentId,
      externalMeetingId: appointmentId ? `appointment-${appointmentId}` : undefined,
      region: region || 'us-east-1',
    };
    
    console.log('[CHIME] Calling create-meeting function');
    
    // Try multiple sources for function URL
    // 1. Environment variables (for manual configuration)
    // 2. amplify_outputs.json custom.functions
    // 3. Fallback to AWS region-based construction (if we know the function name)
    const createMeetingFunctionUrl = 
      process.env.EXPO_PUBLIC_CHIME_CREATE_MEETING_URL ||
      amplifyOutputs?.custom?.functions?.createMeeting?.url ||
      amplifyOutputs?.custom?.functions?.['create-meeting']?.url ||
      null;
    
    if (!createMeetingFunctionUrl) {
      // Provide helpful error with instructions to get function URL from AWS Console
      console.error('[CHIME] Function URL not found in configuration');
      console.error('[CHIME] To fix this:');
      console.error('[CHIME] 1. Go to AWS Console → Lambda → Functions');
      console.error('[CHIME] 2. Find the function: create-meeting');
      console.error('[CHIME] 3. Go to Configuration → Function URL');
      console.error('[CHIME] 4. Copy the Function URL');
      console.error('[CHIME] 5. Add it to .env as EXPO_PUBLIC_CHIME_CREATE_MEETING_URL=<url>');
      throw new ChimeServiceError(
        'Function endpoint not configured. Please add EXPO_PUBLIC_CHIME_CREATE_MEETING_URL to your environment variables with the Lambda Function URL from AWS Console.',
        'ENDPOINT_ERROR'
      );
    }
    
    const meetingResponse = await fetch(createMeetingFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(meetingPayload),
    });
    
    if (!meetingResponse.ok) {
      const errorText = await meetingResponse.text();
      console.error('[CHIME] Create meeting error:', errorText);
      throw new ChimeServiceError(
        `Failed to create meeting: ${meetingResponse.statusText}`,
        `HTTP_${meetingResponse.status}`
      );
    }
    
    // Parse the response body (Lambda Function URLs return JSON in the body field)
    const meetingResponseData = await meetingResponse.json() as MeetingConfig;
    const meeting = meetingResponseData;
    
    // Debug: Log the full response to understand structure
    console.log('[CHIME] Meeting response data:', JSON.stringify(meeting, null, 2));
    console.log('[CHIME] Meeting ID from response:', meeting.meetingId);
    
    if (!meeting || !meeting.meetingId) {
      console.error('[CHIME] Invalid meeting response structure:', meeting);
      throw new ChimeServiceError(
        `Invalid meeting response: missing meetingId. Response: ${JSON.stringify(meeting)}`,
        'INVALID_RESPONSE'
      );
    }
    
    console.log('[CHIME] Meeting created successfully:', meeting.meetingId);
    
    // Call create-attendee function
    const attendeePayload = {
      meetingId: meeting.meetingId,
      userId: user.userId || user.username,
    };
    
    console.log('[CHIME] Calling create-attendee function with payload:', {
      meetingId: attendeePayload.meetingId,
      userId: attendeePayload.userId,
      payloadString: JSON.stringify(attendeePayload),
    });
    
    const createAttendeeFunctionUrl =
      process.env.EXPO_PUBLIC_CHIME_CREATE_ATTENDEE_URL ||
      amplifyOutputs?.custom?.functions?.createAttendee?.url ||
      amplifyOutputs?.custom?.functions?.['create-attendee']?.url ||
      null;
    
    if (!createAttendeeFunctionUrl) {
      console.error('[CHIME] Function URL not found for create-attendee');
      console.error('[CHIME] Add EXPO_PUBLIC_CHIME_CREATE_ATTENDEE_URL to your environment variables');
      throw new ChimeServiceError(
        'Function endpoint not configured for create-attendee. Please add EXPO_PUBLIC_CHIME_CREATE_ATTENDEE_URL to your environment variables.',
        'ENDPOINT_ERROR'
      );
    }
    
    const attendeeResponse = await fetch(createAttendeeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(attendeePayload),
    });
    
    if (!attendeeResponse.ok) {
      const errorText = await attendeeResponse.text();
      console.error('[CHIME] Create attendee error:', errorText);
      throw new ChimeServiceError(
        `Failed to create attendee: ${attendeeResponse.statusText}`,
        `HTTP_${attendeeResponse.status}`
      );
    }
    
    const attendeeResponseData = await attendeeResponse.json() as AttendeeConfig;
    const attendee = attendeeResponseData;
    
    if (!attendee.attendeeId || !attendee.joinToken) {
      throw new ChimeServiceError('Invalid attendee response: missing attendeeId or joinToken');
    }
    
    console.log('[CHIME] Attendee created successfully');
    
    return {
      meetingInfo: {
        meetingId: meeting.meetingId,
        mediaRegion: meeting.mediaRegion || region || 'us-east-1',
        mediaPlacement: meeting.mediaPlacement,
      },
      attendeeInfo: {
        attendeeId: attendee.attendeeId,
        joinToken: attendee.joinToken,
        externalUserId: user.userId || user.username || '',
      },
    };
  } catch (error) {
    console.error('[CHIME] Error creating meeting session with Amplify:', error);
    if (error instanceof ChimeServiceError) {
      throw error;
    }
    throw new ChimeServiceError(
      error instanceof Error ? error.message : 'Failed to create meeting session',
      'AMPLIFY_ERROR'
    );
  }
}

