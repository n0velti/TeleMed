import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda function to create Amazon Chime SDK attendees
 * This function securely creates attendees for existing meetings
 * Security: Only authenticated users can create attendees, and they must provide a valid meeting ID
 */
export const createAttendee = defineFunction({
  entry: './handler.ts',
  name: 'create-attendee',
  timeoutSeconds: 30,
  runtime: 20,
});

