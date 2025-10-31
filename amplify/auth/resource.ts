import { defineAuth } from '@aws-amplify/backend';
import { createUser } from './create-user/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    givenName: {
      required: false,
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
    phoneNumber: {
      required: false,
      mutable: true,
    },
    birthdate: {
      required: false,
      mutable: true,
    },
  },
  triggers: {
    postConfirmation: createUser,
  },
});
