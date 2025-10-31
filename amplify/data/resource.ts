import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { createUser } from '../auth/create-user/resource';

const schema = a.schema({
  Appointment: a
    .model({
      // User information (owner field for authorization)
      owner: a.string(),
      userId: a.string().required(),
      userEmail: a.string(),
      
      // Specialist information
      specialistId: a.string().required(),
      specialistName: a.string().required(),
      specialistSpecialty: a.string().required(),
      specialistPrice: a.integer(),
      
      // Appointment details
      appointmentDate: a.string().required(),
      startTime: a.string().required(),
      endTime: a.string().required(),
      duration: a.string(),
      
      // Purpose/reason for appointment
      purpose: a.string(),
      
      // Status tracking
      status: a.string().default('confirmed'), // confirmed, cancelled, completed
      
      // Timestamps
      createdAt: a.string(),
      updatedAt: a.string(),
      
      // Optional fields for future enhancements
      notes: a.string(),
    })
    .authorization((allow) => allow.authenticated()),

  // Specialist core profile
  Specialist: a
    .model({
      user_id: a.string().required(), // Links to User.id (Cognito sub)
      first_name: a.string().required(),
      last_name: a.string().required(),
      email: a.string().required(),
      phone: a.string(),
      date_of_birth: a.date(),
      photo_url: a.string(),
      government_id_url: a.string(),
      // status: active, pending, suspended, rejected
      status: a.string().default("pending"),
      created_at: a.datetime(),
      updated_at: a.datetime(),
    })
    .authorization((allow) => allow.authenticated()),

  // Medical licenses
  License: a
    .model({
      specialist_id: a.id().required(),
      license_number: a.string().required(),
      // province code (e.g., ON, BC, AB, ...)
      province: a.string().required(),
      issuing_body: a.string().required(),
      issue_date: a.date(),
      expiry_date: a.date(),
      verified: a.boolean().default(false),
      verification_source_url: a.string(),
    })
    .authorization((allow) => allow.authenticated()),

  // Specializations catalog
  Specialization: a
    .model({
      name: a.string().required(),
      description: a.string(),
      category: a.string(), // Physician, Surgeon, Therapist, etc.
      telehealth_suitable: a.boolean().default(true),
    })
    .authorization((allow) => allow.authenticated()),

  // Many-to-many join between specialists and specializations
  SpecialistSpecialization: a
    .model({
      specialist_id: a.id().required(),
      specialization_id: a.id().required(),
    })
    .authorization((allow) => allow.authenticated()),

  // Education history
  Education: a
    .model({
      specialist_id: a.id().required(),
      institution: a.string().required(),
      degree: a.string().required(),
      start_year: a.integer(),
      end_year: a.integer(),
    })
    .authorization((allow) => allow.authenticated()),

  // Availability blocks
  Availability: a
    .model({
      specialist_id: a.id().required(),
      // weekday (Mon-Sun)
      weekday: a.string().required(),
      start_time: a.string().required(),
      end_time: a.string().required(),
      timezone: a.string(),
    })
    .authorization((allow) => allow.authenticated()),

  // Insurance plans accepted
  InsuranceAccepted: a
    .model({
      specialist_id: a.id().required(),
      plan_name: a.string().required(),
      province: a.string(),
    })
    .authorization((allow) => allow.authenticated()),

  // Verification audit trail
  Verification: a
    .model({
      specialist_id: a.id().required(),
      // verification_type: license, ID, insurance, education
      verification_type: a.string().required(),
      verified: a.boolean().default(false),
      verified_by: a.string(),
      date_verified: a.date(),
    })
    .authorization((allow) => allow.authenticated()),

  // Users directory (all users)
  User: a
    .model({
      email: a.string().required(),
      first_name: a.string(),
      last_name: a.string(),
      phone: a.string(),
      date_of_birth: a.date(),
      is_specialist: a.boolean().default(false),
      created_at: a.datetime(),
    })
    .authorization((allow) => allow.authenticated()),
}).authorization(
  (allow) => allow.resource(createUser)
  
);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
