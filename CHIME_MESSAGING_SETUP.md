# Amazon Chime SDK Messaging Integration - Setup Guide

This document explains the Amazon Chime SDK Messaging integration implemented for TeleMed, providing real-time, in-sync messaging capabilities.

## Overview

The integration enables secure, HIPAA-compliant real-time messaging between patients and doctors using Amazon Chime SDK Messaging. The implementation follows industry best practices and is designed for scalability.

## Architecture

### Components

1. **DynamoDB Models** (`amplify/data/resource.ts`)
   - `Conversation`: Stores conversation metadata and Chime channel ARNs
   - `Message`: Stores individual messages for persistence and offline access

2. **Backend Lambda Functions** (`amplify/chime/`)
   - `create-channel`: Creates Chime SDK Messaging channels securely
   - `send-message`: Sends messages to channels and stores in DynamoDB

3. **Service Layer** (`lib/messaging.ts`)
   - Secure API client for calling Lambda functions
   - Conversation and message management
   - Error handling and retry logic

4. **React Hook** (`hooks/use-messaging.ts`)
   - Real-time messaging functionality
   - Automatic message polling for live updates
   - Optimistic UI updates for instant feedback

5. **Messages Screen** (`app/(tabs)/messages.tsx`)
   - Full chat interface with real-time messaging
   - Message history and persistence
   - Loading and error states

## Security Features

### HIPAA Compliance
- ✅ End-to-end encryption (enabled by default in Chime SDK)
- ✅ No PII stored in channel metadata
- ✅ Secure credential handling (no credentials in client code)
- ✅ Authentication required for all operations
- ✅ Access control via channel membership

### Authentication & Authorization
- All Lambda functions require authenticated users (Amplify enforced)
- User ID from Cognito used for message sender identification
- Conversation membership validated before message operations
- DynamoDB authorization ensures users can only access their conversations

### Data Protection
- No sensitive data logged
- Credentials never exposed to client
- Secure token-based authentication
- Encrypted in transit (HTTPS/TLS)
- Messages stored securely in DynamoDB

## Setup Instructions

### 1. AWS IAM Permissions

The Lambda functions need IAM permissions to access Chime SDK Messaging. After deploying with `npx ampx sandbox`, you need to manually add these permissions:

**For `create-channel` function:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "chime:CreateChannel",
        "chime:CreateChannelMembership",
        "chime:DescribeChannel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/*"
    }
  ]
}
```

**For `send-message` function:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "chime:SendChannelMessage",
        "chime:DescribeChannelMembership"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/*"
    }
  ]
}
```

### 2. Chime SDK App Instance Configuration

Before using Chime SDK Messaging, you need to create a Chime SDK App Instance:

1. Go to AWS Console → Amazon Chime → App instances
2. Create a new app instance (or use existing one)
3. Copy the App Instance ARN
4. Add it as an environment variable to the `create-channel` Lambda function:
   - Lambda function → Configuration → Environment variables
   - Add: `CHIME_APP_INSTANCE_ARN = <your-app-instance-arn>`

### 3. Deploy Backend

Deploy your Amplify backend to create the Lambda functions:

```bash
npx ampx sandbox
```

Or for production:

```bash
npx ampx pipeline-deploy --branch main
```

### 4. Function URL Configuration

After deployment, you need to get the Lambda Function URLs and add them to your environment:

1. Go to AWS Console → Lambda → Functions
2. Find each function (`create-channel`, `send-message`)
3. Go to Configuration → Function URL
4. Copy the Function URL
5. Add to `.env` file or `amplify_outputs.json`:

```env
EXPO_PUBLIC_CHIME_CREATE_CHANNEL_URL=https://<function-id>.lambda-url.<region>.on.aws/
EXPO_PUBLIC_CHIME_SEND_MESSAGE_URL=https://<function-id>.lambda-url.<region>.on.aws/
```

Or configure CORS in the Function URL settings:
- Allowed origins: `*` (or specific domains for production)
- Allowed methods: `POST, OPTIONS`
- Allowed headers: `Content-Type, Authorization`

### 5. Test the Integration

1. Create a conversation in your app (via "New" button in messages)
2. Navigate to the conversation
3. Send a message
4. Verify message appears immediately (optimistic update)
5. Check message status changes to "sent" when confirmed
6. Verify real-time updates (polling every 2 seconds)

## Code Structure & Comments

All code is extensively commented explaining:
- Architecture and design decisions
- Security considerations
- HIPAA compliance measures
- Function purposes and parameters
- Error handling strategies
- Scalability considerations
- Performance optimizations

## Real-time Updates

Currently implemented via polling:
- Polls DynamoDB every 2 seconds (configurable)
- Compares message IDs to detect new messages
- Updates UI automatically when new messages arrive

**Future Enhancement Options:**
1. **AWS AppSync Subscriptions**: Real-time GraphQL subscriptions for messages
2. **EventBridge + WebSocket**: Event-driven architecture with WebSocket connections
3. **Chime SDK Webhooks**: Configure Chime SDK to send webhooks on new messages
4. **AWS IoT Core**: Use MQTT for lightweight real-time updates

## Scalability

The implementation is designed to scale:
- **Stateless Lambda functions**: Support concurrent operations
- **DynamoDB**: Handles high-throughput message storage with pagination
- **Chime SDK**: Handles real-time message distribution to channel members
- **Polling optimization**: Only polls when conversation is active
- **Message pagination**: Loads messages in batches (100 messages at a time)

**Scaling Considerations:**
- Polling frequency can be adjusted based on load (default: 2 seconds)
- For high-traffic scenarios, consider implementing rate limiting
- DynamoDB GSI can be added on `participantIds` for faster conversation queries
- Messages can be archived to S3 after retention period

## Performance Optimizations

1. **Optimistic UI Updates**: Messages appear immediately before server confirmation
2. **Lazy Loading**: Messages are loaded in batches (paginated)
3. **Conditional Polling**: Only polls when conversation is active
4. **Message Deduplication**: Uses Chime message IDs to prevent duplicates
5. **Error Recovery**: Automatic retry logic for failed operations

## Troubleshooting

### Channel Creation Fails
- Check IAM permissions for Lambda functions
- Verify CHIME_APP_INSTANCE_ARN environment variable is set
- Check CloudWatch logs for Lambda errors
- Verify Chime SDK App Instance exists and is accessible

### Messages Not Sending
- Check IAM permissions for send-message function
- Verify channelArn is correct
- Check user is a member of the channel
- Review CloudWatch logs for error details

### Real-time Updates Not Working
- Verify polling is enabled (`enablePolling: true`)
- Check conversationId and channelArn are set correctly
- Review network connectivity
- Check polling interval is appropriate (default: 2000ms)

### Messages Not Persisting
- Verify DynamoDB permissions for Lambda functions
- Check Conversation and Message models are deployed
- Review DynamoDB table creation in Amplify console
- Check authorization rules in data schema

### Authentication Errors
- Ensure user is signed in
- Check Amplify configuration
- Verify Cognito user pool is configured
- Review authentication token expiration

## API Usage

### Creating a Conversation

```typescript
import { createConversation } from '@/lib/messaging';

const conversation = await createConversation(
  ['user-id-1', 'user-id-2'], // Participant IDs
  'Dr. Smith',                  // Conversation name
  'direct'                      // Type: 'direct' or 'group'
);
```

### Sending a Message

```typescript
import { sendConversationMessage } from '@/lib/messaging';

const message = await sendConversationMessage(
  conversationId,
  channelArn,
  'Hello, how are you?',
  'Patient Name'
);
```

### Using the Messaging Hook

```tsx
import { useMessaging } from '@/hooks/use-messaging';

const { messages, sendMessage, isLoading, error } = useMessaging({
  conversationId: 'conv-123',
  channelArn: 'arn:aws:chime:...',
  pollInterval: 2000,
  enablePolling: true,
});
```

## Security Checklist

Before going to production:

- [ ] IAM permissions configured correctly for all Lambda functions
- [ ] Lambda functions require authentication
- [ ] CHIME_APP_INSTANCE_ARN environment variable is set
- [ ] Function URLs are configured with proper CORS
- [ ] No credentials in client-side code
- [ ] Error messages don't expose sensitive data
- [ ] Logging doesn't include PII
- [ ] HTTPS enforced for all connections
- [ ] DynamoDB authorization rules are configured
- [ ] Channel membership is validated before sending messages

## Cost Considerations

Amazon Chime SDK Messaging pricing:
- Pay-per-use model
- Charges per message sent
- Storage costs for DynamoDB messages
- Lambda invocation costs
- Review AWS pricing for your region

**Cost Optimization:**
- Implement message archiving to S3 after retention period
- Use DynamoDB TTL for automatic message cleanup
- Optimize polling frequency based on usage patterns
- Consider batch processing for high-volume scenarios

## Future Enhancements

Potential improvements:
1. **WebSocket/Real-time Subscriptions**: Replace polling with WebSocket connections
2. **Message Reactions**: Add emoji reactions to messages
3. **Read Receipts**: Track when messages are read
4. **File Attachments**: Support image and file sharing
5. **Message Threading**: Support reply threads in conversations
6. **Push Notifications**: Background notifications for new messages
7. **Message Search**: Full-text search across conversations
8. **Typing Indicators**: Show when users are typing
9. **Message Editing**: Edit sent messages
10. **Message Deletion**: Delete messages with soft-delete

## Support

For issues or questions:
- Check AWS Chime SDK Messaging documentation: https://docs.aws.amazon.com/chime-sdk/latest/dg/using-the-messaging-sdk.html
- Review Lambda CloudWatch logs
- Check Amplify console for deployment issues
- Review DynamoDB table metrics and throttling

## License & Compliance

- Amazon Chime SDK Messaging is subject to AWS Service Terms
- Ensure compliance with local telehealth regulations (Canada: PIPEDA, provincial health regulations)
- Obtain patient consent for messaging communications
- Implement proper data retention policies
- Follow HIPAA guidelines for PHI in messages

