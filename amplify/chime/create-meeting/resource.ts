import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda function to create Amazon Chime SDK meetings
 * This function securely creates meetings on the backend to avoid exposing AWS credentials
 * Security: Only authenticated users can create meetings
 * 
 * IAM Permissions:
 * - chime:CreateMeeting: Create new Chime SDK meetings
 * - chime:CreateAttendee: Create attendees for meetings (if needed in this function)
 */
export const createMeeting = defineFunction({
  entry: './handler.ts',
  name: 'create-meeting',
  timeoutSeconds: 30,
  runtime: 20,
  // Note: AWS_REGION is automatically set by Lambda runtime
  // Grant IAM permissions for Chime SDK operations via backend.ts
});

