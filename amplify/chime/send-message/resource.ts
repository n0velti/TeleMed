import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda function to send messages via Amazon Chime SDK Messaging
 * 
 * This function securely sends messages to Chime SDK Messaging channels.
 * Messages are delivered in real-time to all channel members.
 * 
 * Security:
 * - Only authenticated users can send messages
 * - Validates user is a channel member before sending
 * - Message content is validated and sanitized
 * 
 * IAM Permissions Required:
 * - chime:SendChannelMessage
 * - chime:DescribeChannelMembership (for validation)
 * - dynamodb:PutItem (for storing message in DynamoDB)
 * 
 * Scalability:
 * - Stateless Lambda supports concurrent message sending
 * - Chime SDK handles message distribution
 * - DynamoDB stores messages for persistence
 */
export const sendMessage = defineFunction({
  entry: './handler.ts',
  name: 'send-message',
  timeoutSeconds: 30,
  runtime: 20,
});

