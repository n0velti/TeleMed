# Setting Up Chime SDK Function URLs

After deploying your backend with `npx ampx sandbox`, you need to enable Function URLs for the Lambda functions.

## Quick Setup Steps

### 1. Enable Function URLs in AWS Console

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Find your functions (they should have names like):
   - `amplify-telemed-edward-sandbox-*-create-meeting-*`
   - `amplify-telemed-edward-sandbox-*-create-attendee-*`

3. For each function:
   - Click on the function name
   - Go to **Configuration** tab
   - Click **Function URL** in the left sidebar
   - Click **Create function URL**
   - Set **Auth type**: `AWS_IAM` (recommended for security) or `NONE` for testing
   - Set **CORS** if using `NONE`:
     - Allow origins: `*` (or your specific domain)
     - Allow methods: `POST`
     - Allow headers: `Content-Type, Authorization`
   - Click **Save**
   - Copy the Function URL

### 2. Add Environment Variables

Create a `.env` file in your project root (or add to existing):

```env
EXPO_PUBLIC_CHIME_CREATE_MEETING_URL=https://your-meeting-function-url.lambda-url.ca-central-1.on.aws/
EXPO_PUBLIC_CHIME_CREATE_ATTENDEE_URL=https://your-attendee-function-url.lambda-url.ca-central-1.on.aws/
```

Replace the URLs with your actual Function URLs from step 1.

### 3. Restart Your Development Server

After adding environment variables:
```bash
# Stop your current server (Ctrl+C)
# Restart it
npm start
```

### 4. Verify It Works

Try joining a video call from an appointment. The error should be resolved!

## Alternative: Automatic Function URL Configuration

For production, you may want to configure Function URLs automatically in your backend code. This requires CDK customizations which can be added later.

## Troubleshooting

- **403 Forbidden**: Check that the Function URL auth type is set correctly and your ID token is being sent
- **CORS errors**: Ensure CORS is configured if using `NONE` auth type
- **Function not found**: Make sure you deployed with `npx ampx sandbox` after adding the functions

