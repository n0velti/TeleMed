# Adding IAM Permissions for Chime SDK

The Lambda functions need IAM permissions to call AWS Chime SDK APIs. Follow these steps to add them manually in AWS Console.

## Error You're Seeing

```
AccessDeniedException: User is not authorized to perform: chime:CreateMeeting
```

This means the Lambda function's IAM role doesn't have permission to create Chime meetings.

## Solution: Add IAM Permissions via AWS Console

### Step 1: Find the Lambda Function Role

1. Go to [AWS Lambda Console](https://console.aws.amazon.com/lambda)
2. Click on your function: `amplify-telemed-edward-sa-createmeetinglambda92999-8xhi4uzkdvHT`
3. Go to **Configuration** tab → **Permissions** (in left sidebar)
4. Under **Execution role**, you'll see a role name (e.g., `amplify-telemed-edward-sa-createmeetinglambdaServic-...`)
5. Click on the role name (it's a link to IAM)

### Step 2: Add IAM Policy to the Role

1. In the IAM Role page, click **Add permissions** → **Create inline policy**
2. Click **JSON** tab
3. Paste this policy:

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

4. Click **Next**
5. Enter policy name: `ChimeCreateMeetingPolicy`
6. Click **Create policy**

### Step 3: Repeat for create-attendee Function

1. Go back to Lambda Console
2. Click on: `amplify-telemed-edward-sa-createattendeelambda11B2-UYTumU9Ju6oZ`
3. Follow same steps, but use this policy:

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

Name it: `ChimeCreateAttendeePolicy`

## Alternative: Using AWS CLI

If you prefer command line:

```bash
# For create-meeting function
ROLE_NAME="amplify-telemed-edward-sa-createmeetinglambdaServic-YQVB5jDz22bx"

aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name ChimeCreateMeetingPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["chime:CreateMeeting"],
      "Resource": "*"
    }]
  }'

# For create-attendee function  
ROLE_NAME="amplify-telemed-edward-sa-createattendeelambdaServic-<role-id>"

aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name ChimeCreateAttendeePolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["chime:CreateAttendee"],
      "Resource": "*"
    }]
  }'
```

Replace `<role-id>` with the actual role ID from Step 1.

## Verification

After adding permissions:

1. Try joining a video call again
2. Check CloudWatch logs for the Lambda function
3. You should see: `[CHIME] Meeting created successfully` instead of AccessDeniedException

## Security Notes

- **Resource: "*"** is required because Chime SDK doesn't use ARN-based resources
- These are minimal permissions - only what's needed for each function
- For production, consider using AWS IAM Access Analyzer to verify permissions

## Troubleshooting

If you still get permission errors:

1. Wait 1-2 minutes after adding policy (IAM propagation delay)
2. Verify the policy is attached to the role:
   - IAM Console → Roles → Your role → Permissions tab
   - Should see your inline policy listed
3. Check CloudWatch logs for exact error message
4. Verify you're using the correct action name (`chime:CreateMeeting` not `chime-sdk:CreateMeeting`)

