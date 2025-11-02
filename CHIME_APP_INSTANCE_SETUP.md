# Chime SDK App Instance Setup Guide

## What is CHIME_APP_INSTANCE_ARN?

`CHIME_APP_INSTANCE_ARN` is the Amazon Resource Name (ARN) of your Amazon Chime SDK Messaging **App Instance**.

## Why Do You Need This?

Amazon Chime SDK Messaging organizes all messaging channels within an **App Instance**. Think of it as:
- **App Instance** = Your organization/application container
- **Channels** = Individual messaging rooms (conversations) within that container

The App Instance ARN is **required** because:
1. **Organization**: All your messaging channels belong to one App Instance
2. **Isolation**: Keeps your channels separate from other applications/tenants
3. **Management**: Provides a logical grouping for all messaging resources
4. **Security**: Enables access control and permissions at the App Instance level

## What Does the ARN Look Like?

An App Instance ARN has this format:
```
arn:aws:chime:region:account-id:app-instance/app-instance-id
```

Example:
```
arn:aws:chime:us-east-1:123456789012:app-instance/12345678-1234-1234-1234-123456789012
```

## How to Get/Create the App Instance ARN

### Option 1: Create via AWS Console (Recommended for First Time)

1. **Navigate to Amazon Chime Console**:
   - Go to AWS Console → Search for "Chime" → Select "Amazon Chime"
   - Or go directly to: https://console.aws.amazon.com/chime/

2. **Create App Instance**:
   - Click on "App instances" in the left sidebar
   - Click "Create app instance"
   - Enter a name (e.g., "TeleMed-Messaging" or "TeleMed-Production")
   - Click "Create"
   - **Copy the ARN** from the App Instance details page

3. **Get the ARN**:
   - The ARN will be displayed on the App Instance details page
   - It looks like: `arn:aws:chime:us-east-1:123456789012:app-instance/xxx-xxx-xxx`

### Option 2: Create via AWS CLI

```bash
# Create the App Instance
aws chime-sdk-identity create-app-instance \
  --name "TeleMed-Messaging" \
  --region us-east-1

# The response will include the AppInstanceArn
# Example response:
# {
#   "AppInstanceArn": "arn:aws:chime:us-east-1:123456789012:app-instance/xxx-xxx-xxx"
# }
```

### Option 3: List Existing App Instances

If you already have an App Instance but don't know its ARN:

```bash
# List all App Instances
aws chime-sdk-identity list-app-instances \
  --region us-east-1

# This will return a list of App Instances with their ARNs
```

## How to Set the Environment Variable

### For Lambda Functions (Backend)

After deploying with `npx ampx sandbox`, you need to add the environment variable to each Lambda function:

1. **Go to AWS Console** → Lambda → Functions
2. **Select your function** (`create-channel` or `send-message`)
3. **Go to Configuration** → Environment variables
4. **Add environment variable**:
   - Key: `CHIME_APP_INSTANCE_ARN`
   - Value: `arn:aws:chime:us-east-1:123456789012:app-instance/your-instance-id`
5. **Save**

### For Local Development (Optional)

If testing locally, you can add to your `.env` file:

```env
CHIME_APP_INSTANCE_ARN=arn:aws:chime:us-east-1:123456789012:app-instance/your-instance-id
```

**Note**: This is mainly for Lambda functions. The frontend doesn't need this directly.

## Important Notes

### One App Instance Per Application
- **Best Practice**: Create one App Instance per application/environment
- For TeleMed: You might have:
  - `TeleMed-Development` (for testing)
  - `TeleMed-Production` (for live users)

### Region Matters
- The App Instance is created in a specific AWS region
- Make sure the region matches where you're deploying your Lambda functions
- Common regions for Canada: `us-east-1`, `ca-central-1`

### Cost
- App Instances themselves are **free**
- You only pay for messaging usage (messages sent, storage, etc.)

### Security
- The App Instance ARN doesn't grant access by itself
- It's just an identifier
- Actual access is controlled by IAM permissions and user identities

## Verification

After setting up, you can verify it works by:

1. **Check Lambda logs**: When creating a channel, you should see logs in CloudWatch
2. **Test conversation creation**: Try creating a conversation - it should work without "App Instance not configured" errors
3. **Check console logs**: The Lambda function will log the App Instance ARN being used

## Troubleshooting

### Error: "Chime App Instance not configured"
- **Solution**: Make sure `CHIME_APP_INSTANCE_ARN` is set in the Lambda function's environment variables
- **Check**: Go to Lambda → Function → Configuration → Environment variables

### Error: "AccessDenied" when creating channels
- **Solution**: The Lambda execution role needs permissions to use the App Instance
- **Fix**: Add IAM permissions for `chime:CreateChannel` and ensure the role has access to this App Instance

### Error: "AppInstanceNotFound"
- **Solution**: Double-check the ARN is correct
- **Verify**: Use AWS CLI: `aws chime-sdk-identity describe-app-instance --app-instance-arn "your-arn"`

## Quick Setup Checklist

- [ ] Create App Instance in AWS Console or via CLI
- [ ] Copy the App Instance ARN
- [ ] Deploy backend: `npx ampx sandbox`
- [ ] Add `CHIME_APP_INSTANCE_ARN` to Lambda function environment variables:
  - [ ] `create-channel` function
  - [ ] `send-message` function (if it needs to create users/identities)
- [ ] Test conversation creation
- [ ] Verify channels are being created successfully

## Example Commands

```bash
# Create App Instance
aws chime-sdk-identity create-app-instance \
  --name "TeleMed-Messaging" \
  --region us-east-1

# List App Instances
aws chime-sdk-identity list-app-instances \
  --region us-east-1

# Describe specific App Instance
aws chime-sdk-identity describe-app-instance \
  --app-instance-arn "arn:aws:chime:us-east-1:123456789012:app-instance/xxx" \
  --region us-east-1
```

## Next Steps

Once you have the App Instance ARN:
1. Set it in Lambda function environment variables
2. Configure Lambda Function URLs (for create-channel and send-message)
3. Test creating a conversation
4. Messages should now work with real-time Chime SDK delivery!

For more details, see `CHIME_MESSAGING_SETUP.md`.

