/**
 * Amazon Chime SDK Service for Amplify Gen 2
 * 
 * Simplified implementation for video calling
 * Uses Lambda Function URLs for secure meeting/attendee creation
 */

import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const dataClient = generateClient<Schema>({ authMode: 'userPool' });

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
    externalUserId: string;
  };
}

export class ChimeError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ChimeError';
  }
}

/**
 * Get function URL from environment or amplify_outputs
 */
function getFunctionUrl(functionName: string): string {
  const envVar = `EXPO_PUBLIC_CHIME_${functionName.toUpperCase().replace(/-/g, '_')}_URL`;
  const url = process.env[envVar];
  
  if (url) return url;
  
  try {
    const outputs = require('../amplify_outputs.json');
    return outputs?.custom?.functions?.[functionName]?.url || 
           outputs?.custom?.functions?.[functionName.replace(/-/g, '')]?.url || '';
  } catch {
    throw new ChimeError(`Function URL not configured for ${functionName}. Set ${envVar} environment variable.`);
  }
}

/**
 * Call Lambda function with authentication
 */
async function callFunction(functionName: string, payload: any): Promise<any> {
    const session = await fetchAuthSession();
    
  if (!session.tokens?.idToken) {
    throw new ChimeError('Not authenticated', 'UNAUTHORIZED');
  }

  const url = getFunctionUrl(functionName);
  if (!url) {
    throw new ChimeError(`Function URL not found for ${functionName}`, 'CONFIG_ERROR');
  }

  const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.tokens.idToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
    throw new ChimeError(`Function error: ${response.statusText}`, `HTTP_${response.status}`);
    }

    let result;
  try {
    const responseText = await response.text();
    if (!responseText) {
      throw new ChimeError(`Empty response from ${functionName}`, 'EMPTY_RESPONSE');
    }
    result = JSON.parse(responseText);
  } catch (parseError: any) {
    throw new ChimeError(`Failed to parse response from ${functionName}: ${parseError.message}`, 'PARSE_ERROR');
  }
  
  // Check if response contains an error
  if (result.error) {
    throw new ChimeError(result.error, 'FUNCTION_ERROR');
  }
  
  // Validate response is not null/undefined
  if (!result || typeof result !== 'object') {
    throw new ChimeError(`Invalid response from ${functionName}`, 'INVALID_RESPONSE');
  }

  return result;
}

/**
 * Create or get meeting session for appointment
 * Reuses existing meeting if one exists
 */
export async function createMeetingSession(
  appointmentId?: string
): Promise<MeetingCredentials> {
  if (!appointmentId) {
    throw new ChimeError('Appointment ID required');
  }

  // Check for existing meeting
  try {
    const appointment = await dataClient.models.Appointment.get({ id: appointmentId });
    
    if (appointment.data?.meetingId && appointment.data?.meetingConfig) {
      try {
        const meeting = JSON.parse(appointment.data.meetingConfig);
        
        // Validate meeting object
        if (!meeting || typeof meeting !== 'object' || !meeting.meetingId) {
          throw new Error('Invalid meeting config');
        }
        
    const user = await getCurrentUser();
        if (!user) {
          throw new ChimeError('User not found', 'USER_ERROR');
        }
        
        // Create attendee for existing meeting
        const attendee = await callFunction('create-attendee', {
          meetingId: meeting.meetingId,
          userId: user.userId || user.username,
        });

        // Validate attendee response with detailed checks
        if (!attendee) {
          throw new ChimeError('Attendee response is null or undefined', 'NULL_RESPONSE');
        }

        if (typeof attendee !== 'object') {
          throw new ChimeError(`Invalid attendee response type: ${typeof attendee}`, 'INVALID_RESPONSE');
        }

        // Check for required fields with detailed error messages
        if (!attendee.attendeeId) {
          throw new ChimeError(`Missing attendeeId in response. Response keys: ${Object.keys(attendee).join(', ')}`, 'MISSING_ATTENDEE_ID');
        }

        if (!attendee.joinToken) {
          throw new ChimeError('Missing joinToken in attendee response', 'MISSING_JOIN_TOKEN');
        }

        // Validate all required fields before returning
        if (!meeting.meetingId) {
          throw new ChimeError('Missing meetingId', 'MISSING_MEETING_ID');
        }

        if (!meeting.mediaPlacement || !meeting.mediaPlacement.audioHostUrl || !meeting.mediaPlacement.signalingUrl) {
          throw new ChimeError('Invalid media placement configuration', 'INVALID_MEDIA_PLACEMENT');
        }

        // Build return object with all validations complete
        const attendeeIdValue = String(attendee.attendeeId || '');
        const joinTokenValue = String(attendee.joinToken || '');
        const externalUserIdValue = String(user.userId || user.username || '');

        if (!attendeeIdValue || !joinTokenValue) {
          throw new ChimeError('Invalid attendee credentials after validation', 'INVALID_CREDENTIALS');
        }

        return {
          meetingInfo: {
            meetingId: String(meeting.meetingId),
            mediaRegion: String(meeting.mediaRegion || 'us-east-1'),
            mediaPlacement: meeting.mediaPlacement || {},
          },
          attendeeInfo: {
            attendeeId: attendeeIdValue,
            joinToken: joinTokenValue,
            externalUserId: externalUserIdValue,
          },
        };
      } catch (parseError) {
        // If parsing fails, create new meeting
      }
    }
  } catch (error) {
    // Continue to create new meeting
  }

  // Create new meeting
  const user = await getCurrentUser();
  if (!user) {
    throw new ChimeError('User not found', 'USER_ERROR');
  }

  const meeting = await callFunction('create-meeting', {
    appointmentId,
    externalMeetingId: `appointment-${appointmentId}`,
    region: 'us-east-1',
  });

  // Validate meeting response
  if (!meeting || typeof meeting !== 'object') {
    throw new ChimeError('Invalid meeting response', 'INVALID_RESPONSE');
  }

  if (!meeting.meetingId) {
    throw new ChimeError('Meeting ID missing from response', 'INVALID_RESPONSE');
  }

  // Store meeting config in appointment
  try {
    await dataClient.models.Appointment.update({
      id: appointmentId,
      meetingId: meeting.meetingId,
      meetingConfig: JSON.stringify(meeting),
    });
  } catch (updateError) {
    // Non-fatal - meeting was created successfully
  }

  // Create attendee
  const attendee = await callFunction('create-attendee', {
    meetingId: meeting.meetingId,
    userId: user.userId || user.username,
  });

  // Validate attendee response with detailed checks
  if (!attendee) {
    throw new ChimeError('Attendee response is null or undefined', 'NULL_RESPONSE');
  }

  if (typeof attendee !== 'object') {
    throw new ChimeError(`Invalid attendee response type: ${typeof attendee}`, 'INVALID_RESPONSE');
  }

  // Check for required fields with detailed error messages
  if (!attendee.attendeeId) {
    throw new ChimeError(`Missing attendeeId in response. Response keys: ${Object.keys(attendee).join(', ')}`, 'MISSING_ATTENDEE_ID');
  }

  if (!attendee.joinToken) {
    throw new ChimeError('Missing joinToken in attendee response', 'MISSING_JOIN_TOKEN');
  }

  // Validate all required fields before returning
  if (!meeting.meetingId) {
    throw new ChimeError('Missing meetingId', 'MISSING_MEETING_ID');
  }

  if (!meeting.mediaPlacement || !meeting.mediaPlacement.audioHostUrl || !meeting.mediaPlacement.signalingUrl) {
    throw new ChimeError('Invalid media placement configuration', 'INVALID_MEDIA_PLACEMENT');
  }
    
  // Build return object with all validations complete
  const attendeeIdValue = String(attendee.attendeeId || '');
  const joinTokenValue = String(attendee.joinToken || '');
  const externalUserIdValue = String(user.userId || user.username || '');

  if (!attendeeIdValue || !joinTokenValue) {
    throw new ChimeError('Invalid attendee credentials after validation', 'INVALID_CREDENTIALS');
  }

  return {
    meetingInfo: {
      meetingId: String(meeting.meetingId),
      mediaRegion: String(meeting.mediaRegion || 'us-east-1'),
      mediaPlacement: meeting.mediaPlacement || {},
    },
    attendeeInfo: {
      attendeeId: attendeeIdValue,
      joinToken: joinTokenValue,
      externalUserId: externalUserIdValue,
    },
  };
}
