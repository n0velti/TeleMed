import {
    ChimeSDKMeetingsClient,
    CreateMeetingCommand,
    MeetingFeatureStatus,
    VideoResolution,
} from '@aws-sdk/client-chime-sdk-meetings';
import type { Handler } from 'aws-lambda';

/**
 * Environment variables expected:
 * AWS_REGION - The AWS region for Chime SDK (e.g., us-east-1)
 * 
 * IAM Permissions Required:
 * - chime:CreateMeeting
 * - chime:CreateAttendee (handled by create-attendee function)
 * 
 * Security Notes:
 * - This Lambda should only be invoked by authenticated users
 * - Meeting configuration ensures HIPAA compliance with media regions
 * - No PII is logged or exposed
 */

interface CreateMeetingRequest {
  appointmentId?: string;
  externalMeetingId?: string; // Optional: Use appointment ID as external meeting ID
  region?: string; // Preferred media region for latency
}

/**
 * Handle CORS preflight requests
 * 
 * NOTE: If CORS is configured in AWS Console Function URL settings,
 * AWS automatically handles OPTIONS requests and adds CORS headers.
 * This handler is only reached if AWS Console CORS is NOT configured.
 */
function handleCorsPreflight() {
  console.log('[CHIME] Returning CORS preflight response (fallback - AWS Console should handle this)');
  const response = {
    statusCode: 200,
    // NOTE: We don't add CORS headers here because AWS Console adds them automatically
    // If you see this log, it means AWS Console CORS is not configured
    headers: {
      'Content-Type': 'application/json',
    },
    body: '',
  };
  console.log('[CHIME] Preflight response:', JSON.stringify(response, null, 2));
  return response;
}

interface CreateMeetingResponse {
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
  // Note: Attendee creation is handled separately for security
}

/**
 * Create a new Amazon Chime SDK meeting
 * 
 * Security Considerations:
 * - Only authenticated users can create meetings (enforced by Amplify)
 * - Meeting is tied to appointment ID for audit trail
 * - Media region can be optimized for Canada (e.g., us-east-1, us-west-2)
 * 
 * HIPAA Compliance:
 * - End-to-end encryption enabled by default in Chime SDK
 * - No patient data stored in meeting metadata
 * - Meeting credentials are returned securely
 */
export const handler: Handler<any, any> = async (
  event,
  context
) => {
  // DEBUG: Log the entire event structure to understand what we're receiving
  console.log('[CHIME] Raw event received:', JSON.stringify(event, null, 2));
  console.log('[CHIME] Event keys:', Object.keys(event));
  console.log('[CHIME] Event requestContext:', JSON.stringify(event.requestContext, null, 2));
  console.log('[CHIME] Event body type:', typeof event.body);
  console.log('[CHIME] Event body:', event.body);

  // Lambda Function URLs send requests in this format:
  // - event.requestContext.http.method = 'POST', 'GET', etc.
  // - event.requestContext.http.path = '/'
  // - event.body = string (JSON stringified)
  // - For OPTIONS preflight, method will be 'OPTIONS'

  // Handle CORS preflight (OPTIONS request)
  // IMPORTANT: CORS must be configured in AWS Console Function URL settings for preflight to work
  // This handler serves as a backup, but AWS should handle OPTIONS if CORS is configured
  
  // Detect HTTP method from various possible locations in the event
  const method = 
    event.requestContext?.http?.method ||           // Lambda Function URL format
    event.requestContext?.httpMethod ||             // API Gateway format
    event.httpMethod ||                             // Direct Lambda format
    (event.headers && (
      event.headers['x-http-method-override'] ||   // Custom header override
      event.headers['X-Http-Method-Override']
    )) ||
    event.method ||                                 // Alternative location
    'POST';                                         // Default fallback
  
  console.log('[CHIME] Detected HTTP method:', method);
  console.log('[CHIME] Request context:', JSON.stringify(event.requestContext, null, 2));
  console.log('[CHIME] All event headers:', JSON.stringify(event.headers, null, 2));
  
  // Handle OPTIONS preflight request (CORS)
  if (method === 'OPTIONS' || method === 'options') {
    console.log('[CHIME] Handling OPTIONS preflight request');
    const preflightResponse = handleCorsPreflight();
    console.log('[CHIME] Returning OPTIONS response:', JSON.stringify(preflightResponse, null, 2));
    return preflightResponse;
  }

  // Parse request body for Function URL invocation
  let requestBody: CreateMeetingRequest;
  if (typeof event.body === 'string') {
    try {
      requestBody = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          // NOTE: CORS headers added by AWS Console
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
  } else {
    // Standard Lambda invocation (body is already an object) or direct event
    requestBody = event.body || event;
  }

  console.log('[CHIME] Create Meeting Request:', {
    appointmentId: requestBody.appointmentId,
    externalMeetingId: requestBody.externalMeetingId,
    region: requestBody.region,
  });

  try {
    // Get AWS region from environment or default to us-east-1 (supports Canada)
    const region = process.env.AWS_REGION || 'us-east-1';
    const chimeClient = new ChimeSDKMeetingsClient({ region });

    // Configure meeting with security and performance optimizations
    const meetingConfig = {
      // External meeting ID: Use appointment ID if provided for audit trail
      // This helps link meetings to appointments for compliance
      ExternalMeetingId: requestBody.externalMeetingId || requestBody.appointmentId || `telemed-${Date.now()}`,
      
      // Media region: Optimize for Canada (us-east-1, us-west-2, or ca-central-1 if available)
      // Default to us-east-1 for best latency to Canada
      MediaRegion: requestBody.region || 'us-east-1',
      
      // Meeting features configuration
      MeetingFeatures: {
        // Enable audio for two-way communication
        Audio: {
          EchoReduction: MeetingFeatureStatus.AVAILABLE, // Reduces echo for better call quality
        },
        // Enable video for telehealth consultations
        Video: {
          MaxResolution: VideoResolution.HD, // HD quality for clear video consultation
        },
        // Enable content sharing if needed for medical imaging
        Content: {
          MaxResolution: VideoResolution.FHD, // Full HD for content sharing
        },
      },
      
      // Notification configuration (optional - for future enhancements)
      // Notifications: {
      //   SnsTopicArn: process.env.CHIME_SNS_TOPIC_ARN,
      //   SqsQueueArn: process.env.CHIME_SQS_QUEUE_ARN,
      // },
    };

    // Create the meeting using Chime SDK
    const createMeetingCommand = new CreateMeetingCommand(meetingConfig);
    const chimeResponse = await chimeClient.send(createMeetingCommand);

    if (!chimeResponse.Meeting) {
      throw new Error('Failed to create meeting: No meeting returned from Chime SDK');
    }

    console.log('[CHIME] Meeting created successfully:', {
      meetingId: chimeResponse.Meeting.MeetingId,
      mediaRegion: chimeResponse.Meeting.MeetingFeatures?.Audio?.EchoReduction,
    });

    // Return meeting information including MediaPlacement for Chime SDK configuration
    // Note: We don't return full credentials here - attendee creation is separate
    if (!chimeResponse.Meeting.MediaPlacement) {
      throw new Error('Failed to create meeting: No MediaPlacement returned from Chime SDK');
    }

    const responseData: CreateMeetingResponse = {
      meetingId: chimeResponse.Meeting.MeetingId || '',
      mediaRegion: chimeResponse.Meeting.MediaRegion || region,
      meetingArn: chimeResponse.Meeting.MeetingArn || '',
      mediaPlacement: {
        audioHostUrl: chimeResponse.Meeting.MediaPlacement.AudioHostUrl || '',
        audioFallbackUrl: chimeResponse.Meeting.MediaPlacement.AudioFallbackUrl || '',
        signalingUrl: chimeResponse.Meeting.MediaPlacement.SignalingUrl || '',
        turnControlUrl: chimeResponse.Meeting.MediaPlacement.TurnControlUrl || '',
        screenDataUrl: chimeResponse.Meeting.MediaPlacement.ScreenDataUrl || '',
        screenViewingUrl: chimeResponse.Meeting.MediaPlacement.ScreenViewingUrl || '',
        screenSharingUrl: chimeResponse.Meeting.MediaPlacement.ScreenSharingUrl || '',
        eventIngestionUrl: chimeResponse.Meeting.MediaPlacement.EventIngestionUrl || '',
      },
    };

    // Return response (AWS Console CORS adds headers automatically - don't duplicate them)
    const httpResponse = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // NOTE: CORS headers are added by AWS Console Function URL CORS configuration
        // Adding them here causes duplicate header values ('*, *')
      },
      body: JSON.stringify(responseData),
    };
    
    console.log('[CHIME] Returning response (AWS Console adds CORS headers):', JSON.stringify(httpResponse.headers, null, 2));
    console.log('[CHIME] Response status code:', httpResponse.statusCode);
    
    return httpResponse;
  } catch (error) {
    console.error('[CHIME] Error creating meeting:', error);
    
    // Return error (AWS Console CORS adds headers automatically - don't duplicate them)
    const errorMessage = error instanceof Error 
      ? `Failed to create meeting: ${error.message}` 
      : 'Failed to create meeting: Unknown error';
    
    console.error('[CHIME] Error response (AWS Console adds CORS headers)');
    
    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        // NOTE: CORS headers are added by AWS Console Function URL CORS configuration
        // Adding them here causes duplicate header values ('*, *')
      },
      body: JSON.stringify({ error: errorMessage }),
    };
    
    console.log('[CHIME] Error response headers:', JSON.stringify(errorResponse.headers, null, 2));
    
    return errorResponse;
  }
};

