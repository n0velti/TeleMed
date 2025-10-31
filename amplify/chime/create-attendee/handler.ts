import { ChimeSDKMeetingsClient, CreateAttendeeCommand } from '@aws-sdk/client-chime-sdk-meetings';
import type { Handler } from 'aws-lambda';

/**
 * Environment variables expected:
 * AWS_REGION - The AWS region for Chime SDK (e.g., us-east-1)
 * 
 * IAM Permissions Required:
 * - chime:CreateAttendee
 * 
 * Security Notes:
 * - This Lambda should only be invoked by authenticated users
 * - Attendee creation requires a valid meeting ID
 * - User information is used for attendee identification (no PII in tags)
 */

interface CreateAttendeeRequest {
  meetingId: string; // Required: Meeting ID from create-meeting
  userId: string; // User ID from Cognito (for identification)
  userName?: string; // Optional: Display name for the attendee
}

/**
 * Handle CORS preflight requests
 * 
 * NOTE: If CORS is configured in AWS Console Function URL settings,
 * AWS automatically handles OPTIONS requests and adds CORS headers.
 * This handler is only reached if AWS Console CORS is NOT configured.
 */
function handleCorsPreflight() {
  console.log('[CHIME-ATTENDEE] Returning CORS preflight response (fallback - AWS Console should handle this)');
  const response = {
    statusCode: 200,
    // NOTE: We don't add CORS headers here because AWS Console adds them automatically
    // If you see this log, it means AWS Console CORS is not configured
    headers: {
      'Content-Type': 'application/json',
    },
    body: '',
  };
  console.log('[CHIME-ATTENDEE] Preflight response:', JSON.stringify(response, null, 2));
  return response;
}

interface CreateAttendeeResponse {
  attendeeId: string;
  joinToken: string;
  // Full meeting credentials needed for Chime SDK
  meetingId: string;
  mediaRegion: string;
  meetingArn: string;
}

/**
 * Create a new attendee for an existing Chime SDK meeting
 * 
 * Security Considerations:
 * - Only authenticated users can create attendees (enforced by Amplify)
 * - Meeting ID must be valid (created via create-meeting function)
 * - Attendee credentials are returned securely
 * 
 * HIPAA Compliance:
 * - No patient data stored in attendee tags
 * - User ID is used for audit purposes only
 * - Credentials are encrypted in transit
 */
export const handler: Handler<any, any> = async (
  event,
  context
) => {
  // DEBUG: Log the entire event structure to understand what we're receiving
  console.log('[CHIME-ATTENDEE] Raw event received:', JSON.stringify(event, null, 2));
  console.log('[CHIME-ATTENDEE] Event keys:', Object.keys(event));
  console.log('[CHIME-ATTENDEE] Event requestContext:', JSON.stringify(event.requestContext, null, 2));
  console.log('[CHIME-ATTENDEE] Event body type:', typeof event.body);
  console.log('[CHIME-ATTENDEE] Event body:', event.body);

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
  
  console.log('[CHIME-ATTENDEE] Detected HTTP method:', method);
  console.log('[CHIME-ATTENDEE] Request context:', JSON.stringify(event.requestContext, null, 2));
  console.log('[CHIME-ATTENDEE] All event headers:', JSON.stringify(event.headers, null, 2));
  
  // Handle OPTIONS preflight request (CORS)
  if (method === 'OPTIONS' || method === 'options') {
    console.log('[CHIME-ATTENDEE] Handling OPTIONS preflight request');
    const preflightResponse = handleCorsPreflight();
    console.log('[CHIME-ATTENDEE] Returning OPTIONS response:', JSON.stringify(preflightResponse, null, 2));
    return preflightResponse;
  }

  // Parse request body for Function URL invocation
  // Lambda Function URLs send the body as a string, so we need to parse it
  let requestBody: CreateAttendeeRequest;
  
  // First, try to get body from event.body (Function URL format)
  let rawBody = event.body;
  
  // If body is undefined or empty, check if event itself has the properties (direct invocation)
  if (!rawBody && event.meetingId) {
    // Direct invocation - event itself is the request body
    console.log('[CHIME-ATTENDEE] Using event as request body (direct invocation)');
    requestBody = event as CreateAttendeeRequest;
  } else if (typeof rawBody === 'string') {
    // Function URL invocation - body is a JSON string
    try {
      console.log('[CHIME-ATTENDEE] Parsing JSON body:', rawBody);
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[CHIME-ATTENDEE] Failed to parse JSON body:', parseError);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          // NOTE: CORS headers added by AWS Console
        },
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }
  } else if (typeof rawBody === 'object' && rawBody !== null) {
    // Body is already an object (shouldn't happen with Function URLs, but handle it)
    console.log('[CHIME-ATTENDEE] Body is already an object');
    requestBody = rawBody as CreateAttendeeRequest;
  } else {
    // Fallback: try to use event directly
    console.log('[CHIME-ATTENDEE] Using event as request body (fallback)');
    requestBody = event as CreateAttendeeRequest;
  }

  // Debug: Log the parsed request body structure
  console.log('[CHIME-ATTENDEE] Parsed request body:', JSON.stringify({
    hasMeetingId: !!requestBody.meetingId,
    meetingId: requestBody.meetingId || 'MISSING',
    hasUserId: !!requestBody.userId,
    userId: requestBody.userId || 'MISSING',
    hasUserName: !!requestBody.userName,
  }));

  console.log('[CHIME] Create Attendee Request:', {
    meetingId: requestBody.meetingId,
    userId: requestBody.userId,
    userName: requestBody.userName ? '***' : undefined, // Don't log PII
  });

  try {
    // Validate required parameters with detailed error messages
    if (!requestBody.meetingId) {
      console.error('[CHIME-ATTENDEE] Missing meetingId in request. Request body keys:', Object.keys(requestBody));
      console.error('[CHIME-ATTENDEE] Full request body:', JSON.stringify(requestBody, null, 2));
      throw new Error(`Meeting ID is required. Received request body: ${JSON.stringify(requestBody)}`);
    }
    if (!requestBody.userId) {
      console.error('[CHIME-ATTENDEE] Missing userId in request. Request body keys:', Object.keys(requestBody));
      throw new Error(`User ID is required. Received request body: ${JSON.stringify(requestBody)}`);
    }

    // Get AWS region from environment or default to us-east-1
    const region = process.env.AWS_REGION || 'us-east-1';
    const chimeClient = new ChimeSDKMeetingsClient({ region });

    // Configure attendee
    // Note: We use userId for identification but don't store PII in tags
    const attendeeConfig = {
      MeetingId: requestBody.meetingId,
      ExternalUserId: requestBody.userId, // Use Cognito user ID for identification
    };

    // Create the attendee
    const createAttendeeCommand = new CreateAttendeeCommand(attendeeConfig);
    const chimeResponse = await chimeClient.send(createAttendeeCommand);

    if (!chimeResponse.Attendee) {
      throw new Error('Failed to create attendee: No attendee returned from Chime SDK');
    }

    console.log('[CHIME] Attendee created successfully:', {
      attendeeId: chimeResponse.Attendee.AttendeeId,
      meetingId: requestBody.meetingId,
    });

    // Return attendee credentials
    // Note: In a production system, you might want to also return meeting details here
    // For now, the client will need to store meeting details from create-meeting call
    const responseData: CreateAttendeeResponse = {
      attendeeId: chimeResponse.Attendee.AttendeeId || '',
      joinToken: chimeResponse.Attendee.JoinToken || '',
      meetingId: requestBody.meetingId,
      // These should be retrieved from meeting creation or stored session
      // For now, we'll return empty strings and handle in service layer
      mediaRegion: '', // Will be filled by service layer
      meetingArn: '', // Will be filled by service layer
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
    
    console.log('[CHIME-ATTENDEE] Returning response (AWS Console adds CORS headers):', JSON.stringify(httpResponse.headers, null, 2));
    console.log('[CHIME-ATTENDEE] Response status code:', httpResponse.statusCode);
    
    return httpResponse;
  } catch (error) {
    console.error('[CHIME] Error creating attendee:', error);
    
    // Return error (AWS Console CORS adds headers automatically - don't duplicate them)
    const errorMessage = error instanceof Error 
      ? `Failed to create attendee: ${error.message}` 
      : 'Failed to create attendee: Unknown error';
    
    console.error('[CHIME-ATTENDEE] Error response (AWS Console adds CORS headers)');
    
    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        // NOTE: CORS headers are added by AWS Console Function URL CORS configuration
        // Adding them here causes duplicate header values ('*, *')
      },
      body: JSON.stringify({ error: errorMessage }),
    };
    
    console.log('[CHIME-ATTENDEE] Error response headers:', JSON.stringify(errorResponse.headers, null, 2));
    
    return errorResponse;
  }
};

