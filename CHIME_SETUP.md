# Amazon Chime SDK Integration - Setup Guide

This document explains the Amazon Chime SDK video calling integration implemented for TeleMed.

## Overview

The integration enables secure, HIPAA-compliant video calling between patients and doctors using Amazon Chime SDK. The implementation follows security best practices and is designed for scalability.

## Architecture

### Components

1. **Backend Lambda Functions** (`amplify/chime/`)
   - `create-meeting`: Creates Chime SDK meetings securely
   - `create-attendee`: Creates attendees for meetings

2. **Service Layer** (`lib/chime.ts`)
   - Secure API client for calling Lambda functions
   - Credential management and error handling

3. **Video Call Component** (`components/video-call.tsx`)
   - React component for video calling UI
   - Chime SDK initialization and management
   - Audio/video controls

4. **Video Call Screen** (`app/video-call/[appointmentId].tsx`)
   - Full-screen video call interface
   - Route handler for appointment-based calls

5. **Integration** (`app/appointment/[id].tsx`)
   - "Join Video Call" button in appointment details
   - Navigation to video call screen

## Security Features

### HIPAA Compliance
- ✅ End-to-end encryption (enabled by default in Chime SDK)
- ✅ No PII stored in meeting metadata
- ✅ Secure credential handling (no credentials in client code)
- ✅ Authentication required for all operations
- ✅ Audit trail via appointment ID linking

### Authentication & Authorization
- All Lambda functions require authenticated users (Amplify enforced)
- User ID from Cognito used for attendee identification
- Appointment validation before allowing video call

### Data Protection
- No sensitive data logged
- Credentials never exposed to client
- Secure token-based authentication
- Encrypted in transit (HTTPS/TLS)

## Setup Instructions

### 1. AWS IAM Permissions

The Lambda functions need IAM permissions to access Chime SDK. After deploying with `npx ampx sandbox`, you may need to manually add these permissions:

**For `create-meeting` function:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "chime:CreateMeeting"
      ],
      "Resource": "*"
    }
  ]
}
```

**For `create-attendee` function:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "chime:CreateAttendee"
      ],
      "Resource": "*"
    }
  ]
}
```

**Note:** In Amplify Gen 2, you may need to configure these permissions in the function resource files or via CDK customizations.

### 2. Install Dependencies

Dependencies are already installed:
- `amazon-chime-sdk-js` - Chime SDK for JavaScript
- `@aws-sdk/client-chime-sdk-meetings` - AWS SDK for Chime SDK Meetings

### 3. Deploy Backend

Deploy your Amplify backend to create the Lambda functions:

```bash
npx ampx sandbox
```

Or for production:

```bash
npx ampx pipeline-deploy --branch main
```

### 4. Environment Configuration

No additional environment variables needed - Amplify handles configuration automatically.

**Optional:** Set AWS region in Lambda environment variables:
- `AWS_REGION` (defaults to `us-east-1` for Canada)

### 5. Test the Integration

1. Create an appointment in your app
2. Navigate to appointment details
3. Click "Join Video Call"
4. Allow camera/microphone permissions
5. Verify video call connects

## Code Structure & Comments

All code is extensively commented explaining:
- Security considerations
- HIPAA compliance measures
- Function purposes
- Error handling strategies
- Platform-specific notes

## Platform Support

### Web (Current Implementation)
- ✅ Full support via Chime SDK JS
- ✅ WebRTC video/audio
- ✅ Device controls (mute, video toggle)

### Mobile (Future Enhancement)
- ⚠️ Currently shows message (Chime SDK JS is browser-based)
- Options for mobile:
  1. Use WebView with Chime SDK web version
  2. Implement native Chime SDK for React Native (if available)
  3. Use hybrid WebView approach

## API Usage

### Creating a Meeting Session

```typescript
import { createMeetingSession } from '@/lib/chime';

const credentials = await createMeetingSession(appointmentId, 'us-east-1');
```

### Video Call Component

```tsx
import { VideoCall } from '@/components/video-call';

<VideoCall 
  appointmentId="appt-123"
  onCallEnd={() => router.back()}
  userName="Dr. Smith"
/>
```

## Troubleshooting

### Meeting Creation Fails
- Check IAM permissions for Lambda functions
- Verify AWS credentials are configured
- Check CloudWatch logs for Lambda errors

### Video Not Displaying
- Ensure camera/microphone permissions are granted
- Check browser console for WebRTC errors
- Verify MediaPlacement URLs are returned from Lambda

### Authentication Errors
- Ensure user is signed in
- Check Amplify configuration
- Verify Cognito user pool is configured

### Network Issues
- Check if meeting region is optimal (us-east-1 for Canada)
- Verify firewall/proxy allows WebRTC traffic
- Check network connectivity

## Security Checklist

Before going to production:

- [ ] IAM permissions configured correctly
- [ ] Lambda functions require authentication
- [ ] No credentials in client-side code
- [ ] Error messages don't expose sensitive data
- [ ] Logging doesn't include PII
- [ ] HTTPS enforced for all connections
- [ ] Content Security Policy configured (for WebView if used)

## Cost Considerations

Amazon Chime SDK pricing:
- Pay-per-use model
- Charges for meeting minutes
- Content sharing incurs additional costs
- Review AWS pricing for your region

## Scalability

The implementation is designed to scale:
- Stateless Lambda functions
- No database dependencies for meeting creation
- Meeting credentials generated on-demand
- Supports concurrent meetings
- Regional optimization for latency

## Future Enhancements

Potential improvements:
1. **Mobile Native Support**: Implement native video calling for iOS/Android
2. **Recording**: Add meeting recording capability (with patient consent)
3. **Screen Sharing**: Enhanced screen sharing for medical imaging
4. **Chat**: Add in-call messaging
5. **Waiting Room**: Implement virtual waiting room
6. **Analytics**: Meeting quality metrics and reporting

## Support

For issues or questions:
- Check AWS Chime SDK documentation: https://docs.aws.amazon.com/chime-sdk/
- Review Lambda CloudWatch logs
- Check Amplify console for deployment issues

## License & Compliance

- Amazon Chime SDK is subject to AWS Service Terms
- Ensure compliance with local telehealth regulations (Canada: PIPEDA, provincial health regulations)
- Obtain patient consent for video consultations
- Implement proper data retention policies

