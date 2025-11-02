import { defineFunction } from '@aws-amplify/backend';

/**
 * Lambda function to create Amazon Chime SDK Messaging channels
 * 
 * This function securely creates messaging channels on the backend to avoid exposing AWS credentials.
 * Channels are used for real-time messaging between users.
 * 
 * Security:
 * - Only authenticated users can create channels
 * - Channel membership is validated before creation
 * - All channel operations require authentication
 * 
 * IAM Permissions Required:
 * - chime:CreateChannel
 * - chime:CreateChannelMembership
 * - chime:DescribeChannel
 * - dynamodb:PutItem (for storing conversation metadata)
 * - dynamodb:GetItem (for validating existing conversations)
 * 
 * Scalability:
 * - Stateless Lambda function supports concurrent invocations
 * - DynamoDB handles high-throughput message storage
 * - Channel creation is idempotent (checks for existing channels)
 */
export const createChannel = defineFunction({
  entry: './handler.ts',
  name: 'create-channel',
  timeoutSeconds: 30,
  runtime: 20,
  // Environment variables are set automatically by Lambda runtime
  // AWS_REGION is available for Chime SDK client configuration
});

