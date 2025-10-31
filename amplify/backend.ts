import { defineBackend } from '@aws-amplify/backend';
import { createUser } from './auth/create-user/resource';
import { auth } from './auth/resource';
import { createAttendee } from './chime/create-attendee/resource';
import { createMeeting } from './chime/create-meeting/resource';
import { data } from './data/resource';

/**
 * Backend configuration including Chime SDK video calling functions
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
  createUser,
  createMeeting,
  createAttendee,
});

/**
 * Add IAM permissions for Chime SDK operations
 * 
 * IMPORTANT: Amplify Gen 2 doesn't expose Lambda constructs directly for IAM customization.
 * IAM permissions must be added manually via AWS Console or AWS CLI.
 * 
 * See ADD_IAM_PERMISSIONS.md for step-by-step instructions.
 * 
 * Required permissions:
 * - create-meeting function: chime:CreateMeeting
 * - create-attendee function: chime:CreateAttendee
 * 
 * These permissions are required for the Lambda functions to interact with AWS Chime SDK.
 * Without these permissions, you'll get AccessDeniedException errors.
 * 
 * TODO: Once Amplify Gen 2 supports programmatic IAM policy addition for functions,
 * this can be automated. For now, use the manual process in ADD_IAM_PERMISSIONS.md
 */

