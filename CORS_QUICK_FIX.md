# CORS Error - Quick Fix Guide

## ⚠️ Current Error
```
Access to fetch at 'https://...lambda-url...' from origin 'http://localhost:8081' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present
```

## 🔧 Solution: Configure CORS in AWS Console

**This is REQUIRED** - Without this, the browser will block all requests.

### Step 1: Open Lambda Console
1. Go to: https://console.aws.amazon.com/lambda
2. Make sure you're in the **ca-central-1** region (Canada)

### Step 2: Configure create-meeting Function

1. **Find the function:**
   - Look for: `amplify-telemed-edward-sa-createmeetinglambda92999-8xhi4uzkdvHT`
   - Or search for: `create-meeting`

2. **Click on the function name** to open it

3. **Go to Configuration tab** (left sidebar)

4. **Click "Function URL"** (under Configuration in left sidebar)

5. **If Function URL exists:**
   - Click the **"Edit"** button
   - Scroll down to **"Configure cross-origin resource sharing (CORS)"**
   - Click **"Configure"**

6. **If Function URL doesn't exist:**
   - Click **"Create function URL"**
   - **Auth type:** Select **`NONE`**
   - Scroll down to **"Configure cross-origin resource sharing (CORS)"**
   - Click **"Configure"**

7. **Enter CORS settings:**
   ```
   Allow origins: *
   Allow methods: POST, OPTIONS
   Allow headers: Content-Type, Authorization, X-Amz-Date, X-Amz-Security-Token
   Expose headers: (leave empty or enter Content-Type)
   Max age: 3600
   Allow credentials: (unchecked)
   ```

8. **Click "Save"**

9. **Copy the Function URL** (looks like: `https://xyz.lambda-url.ca-central-1.on.aws/`)

### Step 3: Configure create-attendee Function

Repeat **Step 2** for the `create-attendee` function:
- Function name: `amplify-telemed-edward-sa-createattendeelambda11B2-UYTumU9Ju6oZ`
- Use the **same CORS settings** as above

### Step 4: Update .env File

Add the Function URLs to your `.env` file in the project root:

```env
EXPO_PUBLIC_CHIME_CREATE_MEETING_URL=https://your-create-meeting-url.lambda-url.ca-central-1.on.aws/
EXPO_PUBLIC_CHIME_CREATE_ATTENDEE_URL=https://your-create-attendee-url.lambda-url.ca-central-1.on.aws/
```

Replace with your actual URLs (without trailing slash, or with trailing slash - both work).

### Step 5: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
# or
expo start
```

## ✅ Verification

1. Open browser console (F12)
2. Try joining a video call
3. Check:
   - ✅ No CORS errors in console
   - ✅ OPTIONS request returns 200
   - ✅ POST request succeeds

## 🔍 Troubleshooting

### Still seeing CORS errors?

1. **Check Function URL CORS is saved:**
   - Go back to Lambda → Function URL
   - Should show "CORS configured" or similar indicator

2. **Verify .env file:**
   - Make sure URLs are correct (no typos)
   - Restart dev server after changing .env

3. **Check CloudWatch Logs:**
   - Lambda function → Monitor → View CloudWatch logs
   - Look for OPTIONS requests being handled

4. **Clear browser cache:**
   - Or use incognito/private mode

### Function URL Not Showing?

If you don't see "Function URL" in Configuration:
1. Make sure you're looking at the correct function
2. Function URLs might need to be enabled in your AWS account
3. Try creating a new Function URL manually

## 📝 Notes

- **CORS must be configured in AWS Console** - our code handles it as backup, but AWS handles preflight requests when configured
- Using `*` for origins allows all domains (OK for development)
- For production, change `*` to your specific domain (e.g., `https://yourdomain.com`)

## 🔒 Security for Production

When ready for production:
1. Change "Allow origins" from `*` to your specific domain
2. Consider using `AWS_IAM` auth type instead of `NONE`
3. Restrict allowed headers to only what you need

