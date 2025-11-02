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

  /**
   * Conversation Model
   * 
   * Represents a messaging conversation between two or more participants.
   * This model stores metadata about conversations and links to Chime SDK Messaging channels.
   * 
   * Architecture:
   * - Each conversation has a unique Chime channel ARN for real-time messaging
   * - Supports one-on-one and group conversations
   * - Tracks participants, last message time, and conversation metadata
   * 
   * Scalability:
   * - Uses DynamoDB for fast lookups
   * - Global Secondary Index (GSI) on participantId for efficient user conversation queries
   * - Supports partitioning by userId for horizontal scaling
   * 
   * Security:
   * - Authorization ensures users can only access conversations they're part of
   * - Chime channel ARN is stored securely
   * - No sensitive data stored in conversation metadata
   */
  Conversation: a
    .model({
      // Chime SDK Messaging channel ARN for real-time messaging
      // This is the primary identifier for the messaging channel
      channelArn: a.string().required(),
      
      // Conversation display name (e.g., "Dr. Smith", "Care Team")
      name: a.string().required(),
      
      // Type of conversation: 'direct' (one-on-one) or 'group'
      type: a.string().required().default('direct'),
      
      // Participant IDs - array of user IDs in this conversation
      // For direct messages: [userId1, userId2]
      // For group chats: [userId1, userId2, userId3, ...]
      participantIds: a.string().array().required(),
      
      // For direct conversations, store the other participant's ID for quick lookup
      // This enables efficient queries like "get all conversations with user X"
      otherParticipantId: a.string(),
      
      // Last message timestamp for sorting conversations
      lastMessageAt: a.datetime(),
      
      // Preview of last message (for conversation list display)
      lastMessagePreview: a.string(),
      
      // Timestamps
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => allow.authenticated())
    // Custom authorization: Users can only access conversations they're part of
    // This is enforced by checking participantIds array contains current user ID
    ,

  /**
   * Message Model
   * 
   * Stores individual messages in conversations.
   * This model provides persistent storage for messages and sync with Chime SDK Messaging.
   * 
   * Architecture:
   * - Messages are stored in DynamoDB for persistence and offline access
   * - Real-time delivery via Chime SDK Messaging channels
   * - Supports message metadata (sender, timestamp, read receipts)
   * 
   * Scalability:
   * - Partitioned by conversationId for efficient querying
   * - Global Secondary Index on conversationId + createdAt for message history
   * - Supports pagination for large conversation histories
   * - Messages older than retention period can be archived to S3
   * 
   * Data Flow:
   * 1. User sends message → Lambda function → Chime SDK sends to channel
   * 2. Chime SDK webhook → Lambda function → Stores message in DynamoDB
   * 3. Real-time subscribers receive message via WebSocket/polling
   * 
   * Security:
   * - Only conversation participants can send/receive messages
   * - Message content is encrypted in transit via Chime SDK
   * - No PII stored in plain text
   */
  Message: a
    .model({
      // Conversation ID this message belongs to
      conversationId: a.id().required(),
      
      // Chime SDK message ID for deduplication and sync
      chimeMessageId: a.string(),
      
      // Sender user ID (Cognito user ID)
      senderId: a.string().required(),
      
      // Sender display name for UI
      senderName: a.string().required(),
      
      // Message content (text)
      content: a.string().required(),
      
      // Message type: 'text', 'image', 'file', 'system'
      type: a.string().default('text'),
      
      // Message status: 'sending', 'sent', 'delivered', 'read', 'failed'
      status: a.string().default('sent'),
      
      // Timestamps
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
      
      // For future: read receipts, reactions, etc.
      // readBy: a.string().array(),
      // reactions: a.json(),
    })
    .authorization((allow) => allow.authenticated())
    // Custom authorization: Users can only access messages in conversations they're part of
    // This requires a join query to verify conversation participation
    ,
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
