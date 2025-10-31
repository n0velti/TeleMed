# Fix CORS Errors - Complete Guide

## The Problem
You're getting CORS errors because:
1. The Lambda functions need to be redeployed with CORS headers (code is ready, needs deployment)
2. The Function URLs in AWS Console need CORS configured

## Solution - Two Parts

### Part 1: Configure CORS in AWS Console (Do This First)

For **BOTH** Lambda functions:

#### Step 1: Open Lambda Function
1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Find:
   - `amplify-telemed-edward-sa-createmeetinglambda92999-8xhi4uzkdvHT`
   - `amplify-telemed-edward-sa-createattendeelambda11B2-UYTumU9Ju6oZ`

#### Step 2: Configure Function URL
For **EACH** function:

1. Click on the function name
2. Go to **Configuration** tab (left sidebar)
3. Click **Function URL** (in the left sidebar under Configuration)
4. If Function URL exists:
   - Click **Edit**
5. If Function URL doesn't exist:
   - Click **Create function URL**
   - Auth type: Select **`NONE`** (we handle auth in code)
   - Configure cross-origin resource sharing (CORS): Click the **Configure** button
6. In CORS configuration:
   - **Allow origins**: Enter `*` (allows all origins - change to your domain in production)
   - **Allow methods**: Enter `POST, OPTIONS`
   - **Allow headers**: Enter `Content-Type, Authorization, X-Amz-Date, X-Amz-Security-Token`
   - **Expose headers**: Leave empty or enter `Content-Type`
   - **Max age**: Enter `3600`
   - **Allow credentials**: Leave unchecked (or check if needed)
7. Click **Save**

#### Step 3: Copy Function URLs
1. After saving, you'll see the Function URL
2. Copy it (looks like: `https://xyz.lambda-url.ca-central-1.on.aws/`)
3. Save both URLs - you'll need them for `.env` file

### Part 2: Update Your .env File

Create or update `.env` in your project root:

```env
EXPO_PUBLIC_CHIME_CREATE_MEETING_URL=https://your-create-meeting-url.lambda-url.ca-central-1.on.aws/
EXPO_PUBLIC_CHIME_CREATE_ATTENDEE_URL=https://your-create-attendee-url.lambda-url.ca-central-1.on.aws/
```

Replace with your actual URLs from Step 3.

### Part 3: Redeploy Lambda Functions

The handler code has been updated with CORS support, but needs to be deployed:

**Option A: If you have a sandbox running:**
1. The sandbox should auto-detect changes and redeploy
2. Check the terminal where sandbox is running for deployment status
3. Wait for: "✔ Deployment completed"

**Option B: If sandbox is not running or you want to force redeploy:**
1. Stop any running sandbox instances (Ctrl+C)
2. Run: `npx ampx sandbox`
3. Wait for deployment to complete

### Part 4: Restart Your App

After deploying:
1. Stop your Expo/React Native dev server (Ctrl+C)
2. Restart: `npm start` or `expo start`
3. Clear browser cache if needed (or use incognito)

## Verification

After completing all steps:

1. Open browser console (F12)
2. Try joining a video call
3. You should see:
   - ✅ No CORS errors
   - ✅ `[CHIME] Meeting created successfully` in logs
   - ✅ Video call initializes

## Troubleshooting

### Still Getting CORS Errors?

1. **Check Function URL CORS settings:**
   - Go back to Lambda Console
   - Verify CORS is configured (should show configured icon)
   - Try temporarily setting "Allow origins" to `*` if you set a specific origin

2. **Verify Function URLs in .env:**
   - Make sure URLs are correct (no extra spaces)
   - Make sure they end with `/`
   - Restart dev server after changing .env

3. **Check Lambda logs:**
   - Go to Lambda function → Monitor → View CloudWatch logs
   - Look for errors or check if function is being invoked

4. **Verify deployment:**
   - Check that latest code is deployed
   - Look at function code in Lambda Console → Code tab
   - Should see CORS headers in the return statements

### Still Not Working?

Check the browser network tab:
1. Open DevTools → Network tab
2. Try joining video call
3. Look for the OPTIONS request (preflight)
   - Should return 200 status
   - Should have CORS headers in response
4. Look for the POST request
   - Should return 200 status
   - Should have CORS headers in response

## Important Notes

- **CORS must be configured in TWO places:**
  1. AWS Console Function URL settings (handles preflight OPTIONS)
  2. Lambda handler code (adds headers to responses) - ✅ Already done, needs deployment

- **For production:**
  - Change `Access-Control-Allow-Origin: *` to your specific domain
  - Update CORS settings in AWS Console to only allow your production domain

## Security Note

Currently using `*` for origins (allows all). For production:
- Set specific origins in AWS Console CORS settings
- Update handler code to only allow your domain
- Consider using `AWS_IAM` auth type instead of `NONE`

