import { env } from '$amplify/env/create-user';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { type Schema } from "../../data/resource";

let client: ReturnType<typeof generateClient<Schema>> | null = null;

async function getDataClient() {
  if (!client) {
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    Amplify.configure(resourceConfig, libraryOptions);
    client = generateClient<Schema>();
  }
  return client;
}

export const handler: PostConfirmationTriggerHandler = async (event) => {
  try {
    console.log('=== POST CONFIRMATION TRIGGER STARTED ===');
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('User Attributes:', event.request?.userAttributes);
    console.log('Client Metadata:', event.request?.clientMetadata);
    
    const attrs = event.request?.userAttributes ?? {};
    const meta = event.request?.clientMetadata ?? {};

    const email = attrs.email;
    // Try to get from metadata first (when custom attributes not deployed), then from attributes
    const firstName = meta.givenName || attrs.givenName || attrs.given_name;
    const lastName = meta.familyName || attrs.familyName || attrs.family_name;
    const phone = meta.phoneNumber || attrs.phoneNumber || attrs.phone_number;
    const birthdate = meta.birthdate || attrs.birthdate; // YYYY-MM-DD

    const isSpecialist = (meta.isSpecialist === 'true') || (meta.is_specialist === 'true');
    console.log('IsSpecialist from metadata:', meta.isSpecialist);
    console.log('IsSpecialist calculated:', isSpecialist);

    if (!email) {
      console.warn('PostConfirmation missing email attribute; skipping User create');
      return event;
    }

    console.log('Creating User with:', {
      email,
      firstName,
      lastName,
      phone,
      birthdate,
      isSpecialist
    });

    const dataClient = await getDataClient();
    await dataClient.models.User.create({
      id: attrs.sub,
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
      date_of_birth: birthdate,
      is_specialist: Boolean(isSpecialist),
      created_at: new Date().toISOString(),
    });
    
    console.log('User created successfully');
  } catch (error) {
    console.error('Error creating User record in PostConfirmation:', error);
  }
  return event;
};