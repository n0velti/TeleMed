import { defineFunction } from '@aws-amplify/backend';

export const createUser = defineFunction({
  entry: './handler.ts',
  name: 'create-user',
});