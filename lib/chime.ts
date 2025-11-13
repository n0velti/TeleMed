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

  return response.json();
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
        const user = await getCurrentUser();
        
        // Create attendee for existing meeting
        const attendee = await callFunction('create-attendee', {
          meetingId: meeting.meetingId,
          userId: user.userId || user.username,
        });

        return {
          meetingInfo: {
            meetingId: meeting.meetingId,
            mediaRegion: meeting.mediaRegion || 'us-east-1',
            mediaPlacement: meeting.mediaPlacement,
          },
          attendeeInfo: {
            attendeeId: attendee.attendeeId,
            joinToken: attendee.joinToken,
            externalUserId: user.userId || user.username || '',
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
  const meeting = await callFunction('create-meeting', {
    appointmentId,
    externalMeetingId: `appointment-${appointmentId}`,
    region: 'us-east-1',
  });

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

  return {
    meetingInfo: {
      meetingId: meeting.meetingId,
      mediaRegion: meeting.mediaRegion || 'us-east-1',
      mediaPlacement: meeting.mediaPlacement,
    },
    attendeeInfo: {
      attendeeId: attendee.attendeeId,
      joinToken: attendee.joinToken,
      externalUserId: user.userId || user.username || '',
    },
  };
}
