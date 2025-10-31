import { defineBackend } from '@aws-amplify/backend';
import { createUser } from './auth/create-user/resource';
import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth,
  data,
  createUser,
});

