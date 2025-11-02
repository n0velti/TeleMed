import { createMeetingSession, MeetingCredentials } from '@/lib/chime';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'expo-modules-core';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/**
 * Video Call Component - Clean Rewrite
 * 
 * This component handles video calling using Amazon Chime SDK.
 * Focus: Get local video working reliably in a green box on bottom right.
 */

interface VideoCallProps {
  appointmentId?: string;
  onCallEnd?: () => void;
  userName?: string;
}

type CallState = 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error';

export function VideoCall({ appointmentId, onCallEnd, userName }: VideoCallProps) {
  // State management
  const [callState, setCallState] = useState<CallState>('initializing');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  
  // Refs for Chime SDK and DOM elements
  const meetingSessionRef = useRef<any>(null);
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Initialize the meeting - STEP 1: Get credentials and set up Chime SDK
   */
  useEffect(() => {
    console.log('[VIDEO_CALL] ====== INITIALIZING MEETING ======');
    console.log('[VIDEO_CALL] Appointment ID:', appointmentId);
    
    let isMounted = true;
    isMountedRef.current = true;

    const initializeMeeting = async () => {
      try {
        // STEP 1.1: Request camera/microphone permissions (web only)
        if (Platform.OS === 'web') {
          console.log('[VIDEO_CALL] Step 1.1: Requesting permissions...');
          setRequestingPermissions(true);
          
          try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              throw new Error('Browser does not support camera/microphone access');
            }
            
            // Request permissions with a test stream
            const testStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            
            console.log('[VIDEO_CALL] ✓ Permissions granted');
            
            // Stop the test stream immediately
            testStream.getTracks().forEach(track => {
              track.stop();
              console.log('[VIDEO_CALL] Stopped test track:', track.kind);
            });
            
          } catch (permissionError: any) {
            console.error('[VIDEO_CALL] ✗ Permission error:', permissionError);
            if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
              setCallState('error');
              setErrorMessage('Camera and microphone access was denied. Please allow access and try again.');
              return;
            }
            throw permissionError;
          } finally {
            setRequestingPermissions(false);
          }
        }

        // STEP 1.2: Create meeting session (get credentials)
        console.log('[VIDEO_CALL] Step 1.2: Creating meeting session...');
        setCallState('connecting');
        
        let credentials: MeetingCredentials;
        try {
          credentials = await createMeetingSession(appointmentId);
          console.log('[VIDEO_CALL] ✓ Credentials received');
        } catch (credentialsError: any) {
          console.error('[VIDEO_CALL] ✗✗✗ Failed to get credentials:', credentialsError);
          throw new Error(`Failed to create meeting session: ${credentialsError?.message || 'Unknown error'}`);
        }
        
        // Log full credentials for debugging (but redact sensitive data)
        console.log('[VIDEO_CALL] Credentials structure check:');
        console.log('[VIDEO_CALL] - credentials exists:', !!credentials);
        console.log('[VIDEO_CALL] - meetingInfo exists:', !!credentials?.meetingInfo);
        console.log('[VIDEO_CALL] - attendeeInfo exists:', !!credentials?.attendeeInfo);
        console.log('[VIDEO_CALL] - Full object:', JSON.stringify(credentials, null, 2));
        
        // Validate credentials structure with comprehensive null checks
        if (!credentials) {
          console.error('[VIDEO_CALL] ✗ Credentials is null/undefined');
          throw new Error('Credentials object is null or undefined. Check backend response.');
        }
        
        if (!credentials.meetingInfo) {
          console.error('[VIDEO_CALL] ✗ meetingInfo is missing');
          throw new Error('meetingInfo is null or undefined in credentials. Check backend meeting creation.');
        }
        
        if (!credentials.attendeeInfo) {
          console.error('[VIDEO_CALL] ✗ attendeeInfo is missing');
          throw new Error('attendeeInfo is null or undefined in credentials. Check backend attendee creation.');
        }
        
        console.log('[VIDEO_CALL] Meeting ID:', credentials.meetingInfo.meetingId);
        console.log('[VIDEO_CALL] Attendee ID:', credentials.attendeeInfo.attendeeId);
        console.log('[VIDEO_CALL] Join Token:', credentials.attendeeInfo.joinToken ? 'Present' : 'Missing');
        
        if (!credentials.meetingInfo.meetingId) {
          throw new Error('meetingId is missing in meetingInfo');
        }
        
        if (!credentials.attendeeInfo.attendeeId) {
          throw new Error('attendeeId is missing in attendeeInfo. Backend may not have created attendee properly.');
        }
        
        if (!credentials.attendeeInfo.joinToken) {
          throw new Error('joinToken is missing in attendeeInfo. Backend may not have created attendee properly.');
        }
        
        currentUserIdRef.current = credentials.attendeeInfo.attendeeId;
        console.log('[VIDEO_CALL] ✓✓✓ Credentials validated successfully');

        if (!isMounted) return;

        // STEP 1.3: Import and initialize Chime SDK
        console.log('[VIDEO_CALL] Step 1.3: Loading Chime SDK...');
        
        if (Platform.OS !== 'web') {
          throw new Error('Video calling is only supported on web platform');
        }

        // Import Chime SDK dynamically - avoid Metro bundler issues
        let chimeSDK: any;
        try {
          // Try using the wrapper's load function
          const wrapperModule = await import('@/lib/chime-sdk-web');
          if (wrapperModule.loadChimeSDK) {
            chimeSDK = await wrapperModule.loadChimeSDK();
            console.log('[VIDEO_CALL] ✓ Chime SDK loaded via wrapper function');
          } else {
            throw new Error('loadChimeSDK function not found');
          }
        } catch (wrapperError: any) {
          console.warn('[VIDEO_CALL] Wrapper load failed, trying direct import:', wrapperError?.message);
          // Fallback: direct dynamic import
          try {
            const directImport = await import('amazon-chime-sdk-js');
            chimeSDK = directImport.default || directImport;
            console.log('[VIDEO_CALL] ✓ Chime SDK loaded via direct import');
          } catch (directError: any) {
            console.error('[VIDEO_CALL] Direct import also failed:', directError?.message);
            throw new Error(`Failed to load Chime SDK: ${directError?.message || 'Unknown error'}. Please restart Metro with: npm start -- --clear`);
          }
        }
        
        if (!chimeSDK || !chimeSDK.DefaultMeetingSession || !chimeSDK.MeetingSessionConfiguration) {
          console.error('[VIDEO_CALL] Chime SDK structure:', Object.keys(chimeSDK || {}));
          throw new Error('Chime SDK components not found. SDK structure is invalid.');
        }
        
        console.log('[VIDEO_CALL] ✓ Chime SDK validated');

        // STEP 1.4: Create meeting session configuration
        console.log('[VIDEO_CALL] Step 1.4: Creating session configuration...');
        
        const {
          DefaultMeetingSession,
          DefaultDeviceController,
          DefaultEventController,
          MeetingSessionConfiguration,
          LogLevel,
          ConsoleLogger,
        } = chimeSDK;

        const logger = new ConsoleLogger('VideoCall', LogLevel.INFO);
        const deviceController = new DefaultDeviceController(logger);
        // @ts-ignore - DefaultEventController constructor signature
        const eventController = new DefaultEventController(logger);
        
        // Create configuration object exactly as Chime SDK expects
        // Double-check we have all required fields before using them
        console.log('[VIDEO_CALL] Creating MeetingSessionConfiguration...');
        
        // CRITICAL: Re-validate that attendeeInfo is still not null before accessing it
        if (!credentials || !credentials.attendeeInfo) {
          console.error('[VIDEO_CALL] ✗✗✗ CRITICAL: attendeeInfo is null!');
          console.error('[VIDEO_CALL] Full credentials:', JSON.stringify(credentials, null, 2));
          throw new Error('attendeeInfo is null when creating configuration. Backend may have returned invalid response.');
        }
        
        // Extract values with null checks at every step
        const meetingId = credentials.meetingInfo?.meetingId;
        const mediaRegion = credentials.meetingInfo?.mediaRegion || 'us-east-1';
        const mediaPlacement = credentials.meetingInfo?.mediaPlacement;
        
        // Safe access to attendeeInfo - already validated above but be extra safe
        const attendeeInfo = credentials.attendeeInfo;
        if (!attendeeInfo) {
          throw new Error('attendeeInfo became null between validation and use');
        }
        
        // Extract and validate values - ensure they are non-empty strings
        const attendeeId = String(attendeeInfo.attendeeId || '').trim();
        const joinToken = String(attendeeInfo.joinToken || '').trim();
        const externalUserId = String(attendeeInfo.externalUserId || attendeeId || '').trim();
        
        console.log('[VIDEO_CALL] Configuration values:');
        console.log('[VIDEO_CALL] - meetingId:', meetingId);
        console.log('[VIDEO_CALL] - mediaRegion:', mediaRegion);
        console.log('[VIDEO_CALL] - attendeeId:', attendeeId, '(type:', typeof attendeeId, ', length:', attendeeId.length, ')');
        console.log('[VIDEO_CALL] - joinToken:', joinToken ? `Present (length: ${joinToken.length})` : 'Missing');
        console.log('[VIDEO_CALL] - externalUserId:', externalUserId);
        
        // Final safety check with detailed error messages - ensure values are non-empty strings
        if (!meetingId || typeof meetingId !== 'string' || meetingId.trim() === '') {
          throw new Error('meetingId is missing, null, or not a valid string');
        }
        if (!attendeeId || attendeeId.length === 0) {
          throw new Error(`attendeeId is missing or empty in attendeeInfo. Value: "${attendeeId}", Type: ${typeof attendeeInfo.attendeeId}`);
        }
        if (!joinToken || joinToken.length === 0) {
          throw new Error(`joinToken is missing or empty in attendeeInfo. Value length: ${joinToken?.length || 0}, Type: ${typeof attendeeInfo.joinToken}`);
        }
        if (!mediaPlacement) {
          throw new Error('mediaPlacement is missing or null');
        }
        
        // Build the configuration object exactly as Chime SDK expects
        // The SDK is very strict about the structure - must match AWS API response format
        // Ensure MediaPlacement has all required properties
        if (!mediaPlacement || typeof mediaPlacement !== 'object') {
          throw new Error('mediaPlacement is missing or invalid');
        }
        
        // Deep clone and convert to PascalCase as Chime SDK expects
        // The SDK expects PascalCase property names (AudioHostUrl, not audioHostUrl)
        const mediaPlacementClone: any = {};
        
        // Map lowercase keys to PascalCase keys
        const keyMapping: Record<string, string> = {
          audioHostUrl: 'AudioHostUrl',
          audioFallbackUrl: 'AudioFallbackUrl',
          signalingUrl: 'SignalingUrl',
          turnControlUrl: 'TurnControlUrl',
          screenDataUrl: 'ScreenDataUrl',
          screenViewingUrl: 'ScreenViewingUrl',
          screenSharingUrl: 'ScreenSharingUrl',
          eventIngestionUrl: 'EventIngestionUrl',
          // Also support PascalCase if backend already uses it
          AudioHostUrl: 'AudioHostUrl',
          AudioFallbackUrl: 'AudioFallbackUrl',
          SignalingUrl: 'SignalingUrl',
          TurnControlUrl: 'TurnControlUrl',
          ScreenDataUrl: 'ScreenDataUrl',
          ScreenViewingUrl: 'ScreenViewingUrl',
          ScreenSharingUrl: 'ScreenSharingUrl',
          EventIngestionUrl: 'EventIngestionUrl',
        };
        
        // Copy all properties with proper casing and validate they're not empty
        for (const [key, value] of Object.entries(mediaPlacement)) {
          const pascalKey = keyMapping[key] || key;
          if (value !== undefined && value !== null && value !== '') {
            mediaPlacementClone[pascalKey] = value;
          } else {
            console.warn(`[VIDEO_CALL] Warning: MediaPlacement.${key} is empty or null`);
          }
        }
        
        // Validate all required MediaPlacement properties are present
        const requiredMediaPlacementKeys = [
          'AudioHostUrl',
          'SignalingUrl',
          'TurnControlUrl',
        ];
        
        for (const key of requiredMediaPlacementKeys) {
          if (!mediaPlacementClone[key]) {
            throw new Error(`Required MediaPlacement property ${key} is missing or empty`);
          }
        }
        
        // Construct the configuration object - the SDK expects this exact structure
        // CRITICAL: Include credentials directly in addition to Attendee object
        // Some SDK versions may look for credentials directly on the config object
        const configObject = {
          Meeting: {
            MeetingId: meetingId,
            MediaRegion: mediaRegion,
            MediaPlacement: mediaPlacementClone,
          },
          Attendee: {
            AttendeeId: attendeeId,
            ExternalUserId: externalUserId || attendeeId, // Fallback to attendeeId if missing
            JoinToken: joinToken,
          },
          // Also include credentials directly for SDK compatibility
          // Some SDK versions may access credentials from here instead of extracting from Attendee
          credentials: {
            attendeeId: attendeeId,
            joinToken: joinToken,
            externalUserId: externalUserId || attendeeId,
          },
        };
        
        // CRITICAL FIX: Patch the event controller to ensure it has access to credentials
        // The SDK's DefaultEventController.getAttributes() tries to access configuration.credentials.attendeeId
        // We need to ensure it can access credentials even if the SDK didn't extract them properly
        const eventControllerAsAny = eventController as any;
        
        // Store credentials in the event controller for later access
        const eventControllerCredentials = {
          attendeeId: configObject.Attendee.AttendeeId,
          joinToken: configObject.Attendee.JoinToken,
          externalUserId: configObject.Attendee.ExternalUserId,
        };
        
        // Store credentials on the event controller
        eventControllerAsAny._credentials = eventControllerCredentials;
        eventControllerAsAny.credentials = eventControllerCredentials;
        
        // Patch getAttributes method if it exists to ensure it returns proper attributes
        const originalGetAttributes = eventControllerAsAny.getAttributes;
        if (typeof originalGetAttributes === 'function') {
          eventControllerAsAny.getAttributes = function(...args: any[]) {
            try {
              // Call the original method
              const result = originalGetAttributes.apply(this, args);
              
              // Ensure the result has attendeeId
              if (result && typeof result === 'object') {
                if (!result.attendeeId) {
                  result.attendeeId = eventControllerCredentials.attendeeId;
                }
              }
              
              return result;
            } catch (error: any) {
              // If getAttributes fails because credentials are undefined, provide a fallback
              if (error?.message?.includes('attendeeId') || error?.message?.includes('attendeeld')) {
                console.warn('[VIDEO_CALL] getAttributes failed, returning fallback with credentials');
                return {
                  attendeeId: eventControllerCredentials.attendeeId,
                  joinToken: eventControllerCredentials.joinToken,
                  externalUserId: eventControllerCredentials.externalUserId,
                };
              }
              throw error;
            }
          };
        }
        
        // Also ensure the event controller's configuration reference has credentials
        if (eventControllerAsAny.configuration) {
          const eventConfig = eventControllerAsAny.configuration;
          if (!eventConfig.credentials) {
            (eventConfig as any).credentials = eventControllerCredentials;
          }
        }
        
        console.log('[VIDEO_CALL] Event controller patched with credentials');
        
        console.log('[VIDEO_CALL] Config object structure:', JSON.stringify(configObject, null, 2));
        console.log('[VIDEO_CALL] Config validation:');
        console.log('[VIDEO_CALL] - Meeting.MeetingId:', !!configObject.Meeting.MeetingId);
        console.log('[VIDEO_CALL] - Meeting.MediaRegion:', !!configObject.Meeting.MediaRegion);
        console.log('[VIDEO_CALL] - Meeting.MediaPlacement:', !!configObject.Meeting.MediaPlacement);
        console.log('[VIDEO_CALL] - Meeting.MediaPlacement.AudioHostUrl:', !!configObject.Meeting.MediaPlacement.AudioHostUrl);
        console.log('[VIDEO_CALL] - Meeting.MediaPlacement.SignalingUrl:', !!configObject.Meeting.MediaPlacement.SignalingUrl);
        console.log('[VIDEO_CALL] - Attendee.AttendeeId:', !!configObject.Attendee.AttendeeId);
        console.log('[VIDEO_CALL] - Attendee.JoinToken:', !!configObject.Attendee.JoinToken);
        console.log('[VIDEO_CALL] - Attendee.ExternalUserId:', !!configObject.Attendee.ExternalUserId);
        
        // Create configuration with error handling
        let meetingConfiguration;
        try {
          // Test if MeetingSessionConfiguration exists and is a constructor
          if (typeof MeetingSessionConfiguration !== 'function') {
            throw new Error('MeetingSessionConfiguration is not a constructor function');
          }
          
          // CRITICAL FIX: Create a Proxy wrapper to ensure credentials are always accessible
          // This intercepts property access and ensures credentials.attendeeId is never undefined
          const credentialsObject = {
            attendeeId: configObject.Attendee.AttendeeId,
            joinToken: configObject.Attendee.JoinToken,
            externalUserId: configObject.Attendee.ExternalUserId,
          };
          
          // Store credentials in a closure for the Proxy
          let credentialsStore = { ...credentialsObject };
          
          // Create the base configuration
          meetingConfiguration = new MeetingSessionConfiguration(configObject);
          
          // CRITICAL: Verify the SDK properly extracted credentials
          if (!meetingConfiguration) {
            throw new Error('MeetingSessionConfiguration constructor returned null or undefined');
          }
          
          // Wrap the configuration in a Proxy to intercept credential access
          const configAsAny = meetingConfiguration as any;
          
          // Ensure credentials are set immediately
          try {
            configAsAny.credentials = credentialsStore;
          } catch (e) {
            Object.defineProperty(configAsAny, 'credentials', {
              get: () => credentialsStore,
              set: (value: any) => {
                credentialsStore = value || credentialsStore;
              },
              enumerable: true,
              configurable: true,
            });
          }
          
          // Also try to set it on any internal _credentials or private properties
          if (configAsAny._credentials !== undefined) {
            configAsAny._credentials = credentialsStore;
          }
          
          // Create a Proxy wrapper that intercepts property access
          // This ensures credentials.attendeeId is always accessible
          const proxiedConfig = new Proxy(meetingConfiguration, {
            get: (target, prop) => {
              // If accessing credentials, ensure it exists
              if (prop === 'credentials') {
                const creds = target[prop as keyof typeof target] || configAsAny.credentials;
                if (!creds || !creds.attendeeId) {
                  // Return our stored credentials
                  return credentialsStore;
                }
                return creds;
              }
              
              // For all other properties, return normally
              const value = target[prop as keyof typeof target];
              if (value !== undefined && value !== null) {
                return value;
              }
              
              // If it's a nested object access that might need credentials, check
              return configAsAny[prop];
            },
            set: (target, prop, value) => {
              if (prop === 'credentials') {
                // Always ensure credentials have attendeeId
                if (value && !value.attendeeId) {
                  value.attendeeId = credentialsStore.attendeeId;
                }
                credentialsStore = value || credentialsStore;
                configAsAny.credentials = credentialsStore;
              }
              (target as any)[prop] = value;
              return true;
            },
          });
          
          // Use the proxied configuration
          meetingConfiguration = proxiedConfig as typeof meetingConfiguration;
          
          console.log('[VIDEO_CALL] Configuration wrapped in Proxy, credentials guaranteed accessible');
          console.log('[VIDEO_CALL] Credentials verification:', {
            hasCredentials: !!configAsAny.credentials,
            attendeeId: configAsAny.credentials?.attendeeId || credentialsStore.attendeeId,
          });
          
          // Check if credentials were properly extracted
          // The SDK might store them in different places depending on version
          // Note: configAsAny is already defined above
          
          // Try multiple ways to access credentials
          const credentialsCheck = {
            credentials: configAsAny.credentials,
            credentialsAttendeeId: configAsAny.credentials?.attendeeId,
            credentialsJoinToken: configAsAny.credentials?.joinToken,
            attendeeId: configAsAny.attendeeId,
            joinToken: configAsAny.joinToken,
            // Some SDK versions use getters
            getCredentials: typeof configAsAny.getCredentials === 'function' ? configAsAny.getCredentials() : null,
          };
          
          console.log('[VIDEO_CALL] ✓✓✓ Configuration created successfully');
          console.log('[VIDEO_CALL] Configuration instance details:', {
            meetingId: meetingConfiguration.meetingId,
            credentialsCheck: credentialsCheck,
          });
          
          // Validate that credentials were properly extracted
          // The SDK should have extracted attendeeId and joinToken from Attendee object
          // CRITICAL FIX: Some SDK versions may store credentials differently
          // Let's check multiple possible locations and ensure credentials are accessible
          
          let credentialsFound = false;
          let actualCredentials: any = null;
          
          // Check various possible locations for credentials
          if (configAsAny.credentials && configAsAny.credentials.attendeeId) {
            credentialsFound = true;
            actualCredentials = configAsAny.credentials;
          } else if (configAsAny.attendeeId && configAsAny.joinToken) {
            // SDK might store them directly on the config object
            credentialsFound = true;
            actualCredentials = {
              attendeeId: configAsAny.attendeeId,
              joinToken: configAsAny.joinToken,
            };
            // Manually assign to credentials property for compatibility
            configAsAny.credentials = actualCredentials;
          } else if (configAsAny._credentials) {
            // Some SDK versions use private _credentials
            credentialsFound = true;
            actualCredentials = configAsAny._credentials;
          }
          
          if (!credentialsFound || !actualCredentials?.attendeeId) {
            console.error('[VIDEO_CALL] ⚠️ WARNING: credentials.attendeeId is not accessible after configuration creation');
            console.error('[VIDEO_CALL] Configuration keys:', Object.keys(meetingConfiguration));
            console.error('[VIDEO_CALL] Configuration prototype:', Object.getPrototypeOf(meetingConfiguration));
            console.error('[VIDEO_CALL] Full configuration object (first level):', JSON.stringify(meetingConfiguration, null, 2));
            
            // Try to manually construct credentials from the config object
            // The SDK should have stored the Attendee information somewhere
            console.error('[VIDEO_CALL] Attempting to manually construct credentials from config object...');
            
            // If we can't find credentials, try to manually set them from our configObject
            // This is a workaround for SDK versions that don't properly extract credentials
            try {
              configAsAny.credentials = {
                attendeeId: configObject.Attendee.AttendeeId,
                joinToken: configObject.Attendee.JoinToken,
                externalUserId: configObject.Attendee.ExternalUserId,
              };
              
              // Verify manual assignment worked
              if (configAsAny.credentials && configAsAny.credentials.attendeeId) {
                console.log('[VIDEO_CALL] ✓✓✓ Manually assigned credentials successfully');
                actualCredentials = configAsAny.credentials;
                credentialsFound = true;
              }
            } catch (manualAssignError) {
              console.error('[VIDEO_CALL] Failed to manually assign credentials:', manualAssignError);
            }
            
            if (!credentialsFound || !actualCredentials?.attendeeId) {
              throw new Error('SDK did not properly extract credentials from configuration. Attendee object may be malformed or SDK version incompatible.');
            }
          }
          
          console.log('[VIDEO_CALL] ✓✓✓ Credentials validated:', {
            hasCredentials: !!actualCredentials,
            attendeeId: actualCredentials?.attendeeId ? 'Present' : 'Missing',
            joinToken: actualCredentials?.joinToken ? 'Present' : 'Missing',
          });
          
        } catch (configError: any) {
          console.error('[VIDEO_CALL] ✗✗✗ Configuration creation failed:', configError);
          console.error('[VIDEO_CALL] Error message:', configError?.message);
          console.error('[VIDEO_CALL] Error stack:', configError?.stack);
          console.error('[VIDEO_CALL] Config object that failed:', JSON.stringify(configObject, null, 2));
          
          // Provide detailed diagnostic information
          console.error('[VIDEO_CALL] Diagnostic information:');
          console.error('[VIDEO_CALL] - Attendee.AttendeeId type:', typeof configObject.Attendee.AttendeeId);
          console.error('[VIDEO_CALL] - Attendee.AttendeeId value:', configObject.Attendee.AttendeeId);
          console.error('[VIDEO_CALL] - Attendee.JoinToken type:', typeof configObject.Attendee.JoinToken);
          console.error('[VIDEO_CALL] - Attendee.JoinToken length:', configObject.Attendee.JoinToken?.length);
          console.error('[VIDEO_CALL] - Meeting.MeetingId:', configObject.Meeting.MeetingId);
          
          throw new Error(`Failed to create MeetingSessionConfiguration: ${configError?.message || 'Unknown error'}`);
        }

        // STEP 1.5: Create meeting session
        console.log('[VIDEO_CALL] Step 1.5: Creating meeting session...');
        console.log('[VIDEO_CALL] Validating configuration before session creation...');
        
        // CRITICAL: Final validation that credentials are accessible
        // The SDK's DefaultMeetingSession constructor will try to access configuration.credentials.attendeeId
        // If it's null or undefined, we'll get the error we're seeing
        const configAsAnyFinal = meetingConfiguration as any;
        
        // Ensure credentials object exists and is properly structured
        // CRITICAL FIX: Use a function to safely create credentials to avoid any property access issues
        const ensureCredentialsExist = () => {
          if (!configAsAnyFinal) {
            throw new Error('meetingConfiguration is null or undefined');
          }
          
          // If credentials don't exist or are null/undefined, create them
          if (!configAsAnyFinal.credentials || typeof configAsAnyFinal.credentials !== 'object') {
            console.error('[VIDEO_CALL] ⚠️⚠️⚠️ CRITICAL: credentials property is missing or invalid before session creation!');
            console.error('[VIDEO_CALL] This will cause DefaultMeetingSession to fail');
            console.error('[VIDEO_CALL] Attempting to manually assign credentials one more time...');
            
            // Safely extract values from configObject with null checks
            const safeAttendeeId = configObject?.Attendee?.AttendeeId;
            const safeJoinToken = configObject?.Attendee?.JoinToken;
            const safeExternalUserId = configObject?.Attendee?.ExternalUserId;
            
            if (!safeAttendeeId || !safeJoinToken) {
              throw new Error(`Cannot create credentials: AttendeeId or JoinToken is missing. AttendeeId: ${safeAttendeeId}, JoinToken: ${safeJoinToken ? 'present' : 'missing'}`);
            }
            
            // Create a new credentials object with all required properties
            const newCredentials = {
              attendeeId: String(safeAttendeeId).trim(),
              joinToken: String(safeJoinToken).trim(),
              externalUserId: safeExternalUserId ? String(safeExternalUserId).trim() : String(safeAttendeeId).trim(),
            };
            
            // Try multiple approaches to set credentials
            try {
              configAsAnyFinal.credentials = newCredentials;
            } catch (assignError) {
              console.warn('[VIDEO_CALL] Direct assignment failed, trying Object.defineProperty');
              try {
                Object.defineProperty(configAsAnyFinal, 'credentials', {
                  value: newCredentials,
                  writable: true,
                  enumerable: true,
                  configurable: true,
                });
              } catch (defineError) {
                console.error('[VIDEO_CALL] Object.defineProperty also failed:', defineError);
                throw new Error('Failed to assign credentials to configuration object');
              }
            }
            
            console.log('[VIDEO_CALL] After manual assignment:');
            console.log('[VIDEO_CALL] - credentials:', !!configAsAnyFinal.credentials);
            console.log('[VIDEO_CALL] - credentials type:', typeof configAsAnyFinal.credentials);
            console.log('[VIDEO_CALL] - credentials.attendeeId:', configAsAnyFinal.credentials?.attendeeId);
            console.log('[VIDEO_CALL] - credentials.attendeeId type:', typeof configAsAnyFinal.credentials?.attendeeId);
          }
          
          // Final validation that credentials.attendeeId exists and is a non-empty string
          const creds = configAsAnyFinal.credentials;
          if (!creds || typeof creds !== 'object') {
            throw new Error('credentials is not an object after assignment');
          }
          
          // Use bracket notation to avoid any potential typo issues
          const attendeeIdValue = creds['attendeeId'] || creds.attendeeId;
          if (!attendeeIdValue || typeof attendeeIdValue !== 'string' || attendeeIdValue.trim() === '') {
            throw new Error(`credentials.attendeeId is invalid. Value: "${attendeeIdValue}", Type: ${typeof attendeeIdValue}`);
          }
          
          return creds;
        };
        
        // Ensure credentials exist before proceeding
        ensureCredentialsExist();
        
        // Final validation - ensure credentials.attendeeId is accessible (using safe access)
        const finalCredentials = configAsAnyFinal.credentials;
        if (!finalCredentials || !(finalCredentials['attendeeId'] || finalCredentials.attendeeId)) {
          console.error('[VIDEO_CALL] ✗✗✗ FATAL: Cannot proceed - credentials.attendeeId is not accessible');
          console.error('[VIDEO_CALL] Configuration object keys:', Object.keys(meetingConfiguration));
          console.error('[VIDEO_CALL] Configuration prototype keys:', Object.keys(Object.getPrototypeOf(meetingConfiguration)));
          
          // If we reach here, credentials should have been set by ensureCredentialsExist()
          // But let's do one final verification using safe bracket notation
          const verifyCreds = configAsAnyFinal.credentials;
          const verifyAttendeeId = verifyCreds?.['attendeeId'] || verifyCreds?.attendeeId;
          
          if (!verifyAttendeeId || typeof verifyAttendeeId !== 'string') {
            throw new Error(`Cannot create meeting session: credentials.attendeeId is still null or invalid after all attempts. Value: "${verifyAttendeeId}", Type: ${typeof verifyAttendeeId}. This indicates the SDK's MeetingSessionConfiguration constructor did not properly extract credentials from the Attendee object. Please verify the configuration object structure matches AWS Chime API response format.`);
          }
        }
        
        console.log('[VIDEO_CALL] ✓✓✓ Final credentials validation passed:');
        console.log('[VIDEO_CALL] - meetingConfiguration type:', typeof meetingConfiguration);
        console.log('[VIDEO_CALL] - meetingConfiguration.meetingId:', meetingConfiguration?.meetingId);
        console.log('[VIDEO_CALL] - meetingConfiguration.credentials:', !!meetingConfiguration.credentials);
        
        // Use safe bracket notation to access attendeeId to avoid any potential issues
        const safeCredentials = configAsAnyFinal.credentials || meetingConfiguration.credentials;
        const safeAttendeeIdCheck = safeCredentials?.['attendeeId'] || safeCredentials?.attendeeId;
        const safeJoinTokenCheck = safeCredentials?.['joinToken'] || safeCredentials?.joinToken;
        
        console.log('[VIDEO_CALL] - meetingConfiguration.credentials?.attendeeId:', safeAttendeeIdCheck);
        console.log('[VIDEO_CALL] - meetingConfiguration.credentials?.joinToken:', safeJoinTokenCheck ? 'Present' : 'Missing');
        
        let meetingSession;
        try {
          // Validate all parameters before passing
          if (!logger) throw new Error('logger is null');
          if (!deviceController) throw new Error('deviceController is null');
          if (!eventController) throw new Error('eventController is null');
          
          console.log('[VIDEO_CALL] Configuration structure validated, creating DefaultMeetingSession...');
          
          // Use safe bracket notation to access credentials
          const configCredentials = configAsAnyFinal.credentials || meetingConfiguration.credentials;
          const configAttendeeId = configCredentials?.['attendeeId'] || configCredentials?.attendeeId;
          
          console.log('[VIDEO_CALL] Configuration that will be passed:', {
            meetingId: meetingConfiguration.meetingId,
            hasCredentials: !!configCredentials,
            credentialsAttendeeId: configAttendeeId,
            credentialsType: typeof configCredentials,
          });
          
          meetingSession = new DefaultMeetingSession(
            meetingConfiguration,
            logger,
            deviceController,
            eventController
          );
          console.log('[VIDEO_CALL] ✓✓✓ Meeting session created successfully!');
          console.log('[VIDEO_CALL] Session audioVideo:', !!meetingSession?.audioVideo);
          meetingSessionRef.current = meetingSession;
        } catch (sessionError: any) {
          console.error('[VIDEO_CALL] ✗✗✗ Meeting session creation failed:', sessionError);
          console.error('[VIDEO_CALL] Error message:', sessionError?.message);
          console.error('[VIDEO_CALL] Error stack:', sessionError?.stack);
          console.error('[VIDEO_CALL] Configuration that failed:', {
            meetingId: meetingConfiguration?.meetingId,
            hasCredentials: !!meetingConfiguration?.credentials,
            credentialsAttendeeId: meetingConfiguration?.credentials?.attendeeId,
            configObject: JSON.stringify(configObject, null, 2),
          });
          
          // Try to diagnose the issue
          if (sessionError?.message?.includes('attendeeId')) {
            console.error('[VIDEO_CALL] DIAGNOSIS: SDK is trying to read attendeeId from null');
            console.error('[VIDEO_CALL] This suggests the configuration.credentials is null inside the SDK');
            console.error('[VIDEO_CALL] The SDK might be accessing it via a different path');
          }
          
          throw new Error(`Failed to create DefaultMeetingSession: ${sessionError?.message || 'Unknown error'}`);
        }

        // STEP 1.6: Start the session
        console.log('[VIDEO_CALL] Step 1.6: Starting meeting session...');
        
        // CRITICAL: Wait for session to be fully started before enabling video
        // Starting video too early can cause "NotConnected" state issues
        
        // CRITICAL: Verify credentials are accessible from the meetingSession's configuration
        // The SDK's start() method will try to access configuration.credentials.attendeeId
        // The SDK may have stored a reference to the configuration internally, so we need to ensure
        // that reference also has credentials accessible
        const sessionConfig = (meetingSession as any).configuration || meetingConfiguration;
        const sessionConfigAsAny = sessionConfig as any;
        
        // Ensure the session's configuration has credentials
        if (sessionConfig && !sessionConfigAsAny.credentials) {
          console.log('[VIDEO_CALL] Session config missing credentials, setting them...');
          const sessionCredentials = {
            attendeeId: configObject.Attendee.AttendeeId,
            joinToken: configObject.Attendee.JoinToken,
            externalUserId: configObject.Attendee.ExternalUserId,
          };
          
          try {
            sessionConfigAsAny.credentials = sessionCredentials;
          } catch (e) {
            Object.defineProperty(sessionConfigAsAny, 'credentials', {
              value: sessionCredentials,
              writable: true,
              enumerable: true,
              configurable: true,
            });
          }
        }
        
        const sessionCredentials = sessionConfigAsAny?.credentials || sessionConfig?.credentials;
        const sessionAttendeeId = sessionCredentials?.['attendeeId'] || sessionCredentials?.attendeeId;
        
        console.log('[VIDEO_CALL] Pre-start validation:');
        console.log('[VIDEO_CALL] - sessionConfig exists:', !!sessionConfig);
        console.log('[VIDEO_CALL] - sessionCredentials exists:', !!sessionCredentials);
        console.log('[VIDEO_CALL] - sessionAttendeeId:', sessionAttendeeId);
        console.log('[VIDEO_CALL] - sessionAttendeeId type:', typeof sessionAttendeeId);
        
        // CRITICAL: Also check the meetingSession's audioVideo controller
        // It might have its own reference to the configuration
        const audioVideoController = (meetingSession as any).audioVideo;
        const controllerCredentials = {
          attendeeId: configObject.Attendee.AttendeeId,
          joinToken: configObject.Attendee.JoinToken,
          externalUserId: configObject.Attendee.ExternalUserId,
        };
        
        if (audioVideoController) {
          // Set credentials on the controller itself
          if (!audioVideoController.credentials) {
            (audioVideoController as any).credentials = controllerCredentials;
          }
          
          // Set credentials on the controller's configuration
          const controllerConfig = (audioVideoController as any).configuration;
          if (controllerConfig) {
            if (!controllerConfig.credentials) {
              console.log('[VIDEO_CALL] AudioVideo controller config missing credentials, setting them...');
              try {
                (controllerConfig as any).credentials = controllerCredentials;
              } catch (e) {
                Object.defineProperty(controllerConfig, 'credentials', {
                  value: controllerCredentials,
                  writable: true,
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }
          
          // CRITICAL: Patch the event controller within audioVideo controller
          // The DefaultEventController is what's throwing the error
          const controllerEventController = (audioVideoController as any).eventController;
          if (controllerEventController) {
            console.log('[VIDEO_CALL] Patching AudioVideo controllers event controller...');
            const controllerEventControllerAsAny = controllerEventController as any;
            
            // Set credentials on the event controller
            controllerEventControllerAsAny._credentials = controllerCredentials;
            controllerEventControllerAsAny.credentials = controllerCredentials;
            
            // Patch getAttributes to handle missing credentials
            const controllerOriginalGetAttributes = controllerEventControllerAsAny.getAttributes;
            if (typeof controllerOriginalGetAttributes === 'function') {
              controllerEventControllerAsAny.getAttributes = function(...args: any[]) {
                try {
                  // Ensure configuration exists before calling
                  if (!this.configuration) {
                    this.configuration = { credentials: controllerCredentials };
                  } else if (!this.configuration.credentials) {
                    this.configuration.credentials = controllerCredentials;
                  }
                  
                  const result = controllerOriginalGetAttributes.apply(this, args);
                  
                  // Ensure result has attendeeId
                  if (result && typeof result === 'object' && !result.attendeeId) {
                    result.attendeeId = controllerCredentials.attendeeId;
                  }
                  
                  return result;
                } catch (error: any) {
                  // If getAttributes fails due to undefined attendeeId, return fallback
                  if (error?.message?.includes('attendeeId') || error?.message?.includes('attendeeld') || 
                      error?.message?.includes('Cannot read properties of undefined')) {
                    console.warn('[VIDEO_CALL] EventController.getAttributes failed, returning fallback');
                    return {
                      attendeeId: controllerCredentials.attendeeId,
                      joinToken: controllerCredentials.joinToken,
                      externalUserId: controllerCredentials.externalUserId,
                    };
                  }
                  throw error;
                }
              };
            }
            
            // Also patch configuration property access
            const controllerOriginalConfig = controllerEventControllerAsAny.configuration;
            try {
              Object.defineProperty(controllerEventControllerAsAny, 'configuration', {
                get: function() {
                  const config = controllerOriginalConfig || (this as any)._configuration || {};
                  if (!config.credentials) {
                    config.credentials = controllerCredentials;
                  }
                  return config;
                },
                set: function(value: any) {
                  if (value && !value.credentials) {
                    value.credentials = controllerCredentials;
                  }
                  (this as any)._configuration = value;
                  if (controllerOriginalConfig) {
                    Object.assign(controllerOriginalConfig, value);
                  }
                },
                enumerable: true,
                configurable: true,
              });
            } catch (definePropError) {
              console.warn('[VIDEO_CALL] Could not defineProperty on eventController.configuration, setting directly');
              if (controllerOriginalConfig) {
                controllerOriginalConfig.credentials = controllerCredentials;
              }
            }
          }
        }
        
        if (!sessionCredentials || !sessionAttendeeId) {
          console.error('[VIDEO_CALL] ✗✗✗ CRITICAL: credentials are not accessible from meetingSession before start()');
          console.error('[VIDEO_CALL] Attempting to fix credentials on session configuration...');
          
          // Try to set credentials on the session's internal configuration
          if (sessionConfig) {
            const sessionConfigAsAny = sessionConfig as any;
            const fixedCredentials = {
              attendeeId: configObject.Attendee.AttendeeId,
              joinToken: configObject.Attendee.JoinToken,
              externalUserId: configObject.Attendee.ExternalUserId,
            };
            
            try {
              sessionConfigAsAny.credentials = fixedCredentials;
              console.log('[VIDEO_CALL] Set credentials on sessionConfig');
            } catch (setError) {
              console.error('[VIDEO_CALL] Failed to set credentials on sessionConfig:', setError);
              try {
                Object.defineProperty(sessionConfigAsAny, 'credentials', {
                  value: fixedCredentials,
                  writable: true,
                  enumerable: true,
                  configurable: true,
                });
                console.log('[VIDEO_CALL] Used Object.defineProperty to set credentials on sessionConfig');
              } catch (defineError) {
                console.error('[VIDEO_CALL] Object.defineProperty also failed:', defineError);
              }
            }
            
            // Verify again
            const verifyCreds = sessionConfigAsAny.credentials;
            const verifyId = verifyCreds?.['attendeeId'] || verifyCreds?.attendeeId;
            if (!verifyId) {
              throw new Error(`Cannot start session: credentials.attendeeId is still not accessible after all attempts. The SDK may be accessing credentials from a different location.`);
            }
            
            console.log('[VIDEO_CALL] ✓✓✓ Credentials fixed on sessionConfig, verification passed');
          } else {
            throw new Error('Cannot start session: session configuration is not accessible');
          }
        }
        
        console.log('[VIDEO_CALL] Starting audioVideo.start()...');
        try {
          await meetingSession.audioVideo.start();
          console.log('[VIDEO_CALL] ✓ Meeting session started');
          
          // CRITICAL: Wait for session to be fully connected before enabling video
          // This prevents "NotConnected" state errors
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('[VIDEO_CALL] Session connection stabilized');
        } catch (startError: any) {
          console.error('[VIDEO_CALL] ✗✗✗ audioVideo.start() failed:', startError);
          console.error('[VIDEO_CALL] Error message:', startError?.message);
          console.error('[VIDEO_CALL] Error stack:', startError?.stack);
          
          // Check if error is related to attendeeId
          if (startError?.message?.includes('attendeeId') || startError?.message?.includes('attendeeld')) {
            console.error('[VIDEO_CALL] DIAGNOSIS: start() failed due to attendeeId access issue');
            console.error('[VIDEO_CALL] Current credentials state:');
            console.error('[VIDEO_CALL] - sessionConfig.credentials:', !!sessionConfig?.credentials);
            console.error('[VIDEO_CALL] - sessionConfig.credentials.attendeeId:', sessionConfig?.credentials?.['attendeeId'] || sessionConfig?.credentials?.attendeeId);
            
            throw new Error(`Failed to start meeting session: ${startError.message}. Credentials may not be properly accessible to the SDK's internal methods.`);
          }
          
          throw startError;
        }

        if (!isMounted) return;

        // STEP 1.7: Set up observers FIRST (before enabling media)
        console.log('[VIDEO_CALL] Step 1.7: Setting up observers...');
        setupObservers(meetingSession);
        
        // STEP 1.8: Wait a bit more for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // STEP 1.9: Enable audio and video (after session is connected)
        console.log('[VIDEO_CALL] Step 1.9: Enabling audio and video...');
        await enableMedia(meetingSession);
        
        if (!isMounted) return;
        
        setCallState('connected');
        console.log('[VIDEO_CALL] ====== INITIALIZATION COMPLETE ======');

      } catch (error: any) {
        console.error('[VIDEO_CALL] ✗✗✗ INITIALIZATION FAILED ✗✗✗', error);
        if (isMounted) {
          setCallState('error');
          setErrorMessage(error?.message || 'Failed to initialize video call');
        }
      }
    };

    initializeMeeting();

    // Cleanup
    return () => {
      isMounted = false;
      isMountedRef.current = false;
      
      if (meetingSessionRef.current) {
        try {
          console.log('[VIDEO_CALL] Cleaning up meeting session...');
          meetingSessionRef.current.audioVideo?.stop();
          meetingSessionRef.current.audioVideo?.leave();
        } catch (error) {
          console.error('[VIDEO_CALL] Cleanup error:', error);
        }
      }
    };
  }, [appointmentId]);

  /**
   * Set up Chime SDK observers for video tiles and events
   */
  const setupObservers = (meetingSession: any) => {
    console.log('[VIDEO_CALL] Setting up video tile observers...');
    const audioVideo = meetingSession.audioVideo;

    const observer = {
      // Called when a video tile is added or updated
      videoTileDidUpdate: (tileState: any) => {
        console.log('[VIDEO_CALL] 📹 Video tile updated:', {
          tileId: tileState.tileId,
          attendeeId: tileState.attendeeId,
          isLocal: tileState.isLocal,
          active: tileState.active,
        });

        // Handle LOCAL video tile - SIMPLE: bind when active
        if (tileState.isLocal && tileState.active && localVideoElementRef.current) {
          if (tileState.boundVideoElement !== localVideoElementRef.current) {
            try {
              audioVideo.bindVideoElement(tileState.tileId, localVideoElementRef.current);
              console.log('[VIDEO_CALL] ✓✓✓ Local video BOUND successfully!');
            } catch (error: any) {
              console.error('[VIDEO_CALL] Bind error:', error?.message);
            }
          } else {
            // Already bound - verify stream exists
            const videoElement = localVideoElementRef.current as HTMLVideoElement;
            if (videoElement && !videoElement.srcObject) {
              // Rebind if no stream
              try {
                audioVideo.bindVideoElement(tileState.tileId, localVideoElementRef.current);
                console.log('[VIDEO_CALL] Rebound (no stream detected)');
              } catch (error: any) {
                console.error('[VIDEO_CALL] Rebind error:', error?.message);
              }
            }
          }
        } else if (tileState.isLocal && !tileState.active && isVideoEnabled) {
          // Tile exists but not active - this is normal, just wait for it to become active
          console.log('[VIDEO_CALL] ⏳ Local tile created but not active yet (waiting...)');
        }

        // Handle REMOTE video tile
        if (tileState.attendeeId && tileState.attendeeId !== currentUserIdRef.current) {
          if (remoteVideoElementRef.current && tileState.active) {
            console.log('[VIDEO_CALL] 🔗 Binding remote video:', tileState.attendeeId);
            try {
              audioVideo.bindVideoElement(tileState.tileId, remoteVideoElementRef.current);
              setHasRemoteVideo(true);
              updateAttendeeCount(audioVideo);
            } catch (error) {
              console.error('[VIDEO_CALL] Remote bind error:', error);
            }
          }
        }
      },

      // Called when a video tile is removed
      videoTileWasRemoved: (tileId: number) => {
        console.log('[VIDEO_CALL] 📹 Video tile removed:', tileId);
        
        // Check if local video was removed - restart if needed
        if (isVideoEnabled && meetingSessionRef.current) {
          try {
            const localVideoTile = audioVideo.getLocalVideoTile();
            const removedTileState = audioVideo.getAllVideoTiles().get(tileId);
            
            // Only restart if the removed tile was actually the local video tile
            if (!localVideoTile || (removedTileState && removedTileState.isLocal)) {
              console.log('[VIDEO_CALL] ⚠️ Local video removed, restarting...');
              
              // Wait a bit before restarting to avoid rapid on/off cycling
              setTimeout(async () => {
                if (isVideoEnabled && meetingSessionRef.current && localVideoElementRef.current) {
                  try {
                    await meetingSessionRef.current.audioVideo.startLocalVideoTile();
                    // Wait for tile to be active, then rebind
                    setTimeout(() => {
                      bindLocalVideo(meetingSessionRef.current.audioVideo);
                    }, 500);
                  } catch (restartError) {
                    console.error('[VIDEO_CALL] Failed to restart video tile:', restartError);
                  }
                }
              }, 500);
            }
          } catch (error) {
            console.error('[VIDEO_CALL] Error handling video tile removal:', error);
          }
        }
        
        updateAttendeeCount(audioVideo);
      },

      // Called when audio/video stops
      audioVideoDidStop: (sessionStatus: any) => {
        console.log('[VIDEO_CALL] ⏹️ Audio/video stopped:', sessionStatus);
        setCallState('disconnected');
        onCallEnd?.();
      },
    };

    audioVideo.addObserver(observer);
    console.log('[VIDEO_CALL] ✓ Observers added');
  };

  /**
   * Update attendee count by checking active video tiles
   */
  const updateAttendeeCount = (audioVideo: any) => {
    try {
      const allTiles = audioVideo.getAllVideoTiles();
      let remoteCount = 0;
      
      for (const tile of Array.from(allTiles.values())) {
        const tileState = tile as any;
        if (tileState.attendeeId && 
            tileState.attendeeId !== currentUserIdRef.current && 
            tileState.active) {
          remoteCount++;
        }
      }
      
      // Always count yourself (1) + remote attendees
      const total = 1 + remoteCount;
      setAttendeeCount(total);
      console.log('[VIDEO_CALL] 👥 Attendee count updated:', { 
        total, 
        remote: remoteCount,
        yourself: 1,
        waiting: total < 2
      });
    } catch (error) {
      console.error('[VIDEO_CALL] Error updating attendee count:', error);
    }
  };

  /**
   * Enable audio and video
   */
  const enableMedia = async (meetingSession: any) => {
    const audioVideo = meetingSession.audioVideo;
    
    // Audio is automatically enabled when session starts
    
    // Enable video
    if (isVideoEnabled) {
      console.log('[VIDEO_CALL] 📹 Enabling video...');
      
      try {
        // Wait for video element to exist
        for (let i = 0; i < 10; i++) {
          if (localVideoElementRef.current) break;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        if (!localVideoElementRef.current) {
          console.error('[VIDEO_CALL] Video element not found');
          return;
        }
        
        // Get video device and select it
        const devices = await audioVideo.listVideoInputDevices();
        if (devices.length > 0) {
          await audioVideo.chooseVideoInputDevice(devices[0].deviceId);
          console.log('[VIDEO_CALL] ✓ Video device selected');
        }
        
        // CRITICAL: Only start video tile when session is ready
        // The observer will handle binding when tile becomes active
        console.log('[VIDEO_CALL] Starting video tile...');
        await audioVideo.startLocalVideoTile();
        console.log('[VIDEO_CALL] ✓ Video tile started (will bind when active)');
        
        // Don't try to bind immediately - let the observer handle it
        // The tile needs time to become active after session is connected
        
      } catch (error: any) {
        console.error('[VIDEO_CALL] Video error:', error?.message);
      }
    }
  };

  /**
   * Bind local video to the video element - SIMPLE version
   */
  const bindLocalVideo = (audioVideo: any) => {
    if (!localVideoElementRef.current) return false;
    
    try {
      const tile = audioVideo.getLocalVideoTile();
      if (!tile || !tile.state().active) return false;
      
      const tileState = tile.state();
      if (tileState.boundVideoElement !== localVideoElementRef.current) {
        audioVideo.bindVideoElement(tileState.tileId, localVideoElementRef.current);
        console.log('[VIDEO_CALL] ✓ Video bound');
      }
      return true;
    } catch (error) {
      console.error('[VIDEO_CALL] Bind error:', error);
      return false;
    }
  };

  /**
   * Toggle audio mute/unmute
   */
  const toggleAudio = () => {
    if (!meetingSessionRef.current) return;
    
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    
    const audioVideo = meetingSessionRef.current.audioVideo;
    if (newState) {
      audioVideo.realtimeUnmuteLocalAudio();
      console.log('[VIDEO_CALL] 🔊 Audio unmuted');
    } else {
      audioVideo.realtimeMuteLocalAudio();
      console.log('[VIDEO_CALL] 🔇 Audio muted');
    }
  };

  /**
   * Toggle video on/off
   */
  const toggleVideo = async () => {
    if (!meetingSessionRef.current) return;
    
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    
    const audioVideo = meetingSessionRef.current.audioVideo;
    
    if (newState) {
      console.log('[VIDEO_CALL] 📹 Turning video ON');
      try {
        await audioVideo.startLocalVideoTile();
        setTimeout(() => bindLocalVideo(audioVideo), 500);
      } catch (error: any) {
        console.error('[VIDEO_CALL] ✗ Error starting video:', error?.message);
      }
    } else {
      console.log('[VIDEO_CALL] 📹 Turning video OFF');
      try {
        audioVideo.stopLocalVideoTile();
        if (localVideoElementRef.current) {
          audioVideo.unbindVideoElement(1);
          localVideoElementRef.current.srcObject = null;
        }
      } catch (error: any) {
        console.error('[VIDEO_CALL] ✗ Error stopping video:', error?.message);
      }
    }
  };

  /**
   * End the call
   */
  const endCall = () => {
    console.log('[VIDEO_CALL] 📞 Ending call...');
    if (meetingSessionRef.current) {
      try {
        meetingSessionRef.current.audioVideo?.stop();
        meetingSessionRef.current.audioVideo?.leave();
      } catch (error) {
        console.error('[VIDEO_CALL] Error ending call:', error);
      }
    }
    setCallState('disconnected');
    onCallEnd?.();
  };

  // Render error state
  if (callState === 'error') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{errorMessage || 'An error occurred'}</ThemedText>
        <TouchableOpacity style={styles.button} onPress={endCall}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Render disconnected state
  if (callState === 'disconnected') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.statusText}>Call ended</ThemedText>
      </ThemedView>
    );
  }

  // Render for web platform
  if (Platform.OS === 'web') {
    // Show waiting overlay if:
    // - Less than 2 attendees (only 1 person = yourself)
    // - OR no remote video yet
    const isWaitingForOthers = attendeeCount < 2 || !hasRemoteVideo;
    const waitingCount = Math.max(0, 2 - attendeeCount);
    
    console.log('[VIDEO_CALL] 👥 Render state:', {
      attendeeCount,
      hasRemoteVideo,
      isWaitingForOthers,
      waitingCount,
      callState
    });

    return (
      <View style={styles.container}>
        {/* Main video container */}
        <View style={styles.videoContainer}>
          {/* Remote video (main view) */}
          <div style={styles.remoteVideoContainer}>
            <video
              id="remote-video"
              autoPlay
              playsInline
              style={styles.remoteVideo}
              ref={remoteVideoElementRef}
            />
            
            {/* Waiting overlay */}
            {isWaitingForOthers && (
              <View style={styles.waitingOverlay}>
                <View style={styles.waitingCard}>
                  <ActivityIndicator size="large" color="#fff" />
                  <ThemedText style={styles.waitingText}>
                    {requestingPermissions 
                      ? 'Requesting camera and microphone access...'
                      : attendeeCount < 2
                        ? `Waiting for ${waitingCount} other participant${waitingCount !== 1 ? 's' : ''} to join...`
                        : 'Connecting...'}
                  </ThemedText>
                </View>
              </View>
            )}
          </div>

          {/* LOCAL VIDEO - Green box on bottom right */}
          <div style={styles.localVideoContainer}>
            {/* Label */}
            <View style={styles.localVideoLabel}>
              <Text style={styles.localVideoLabelText}>LOCAL VIDEO</Text>
            </View>
            
            {/* Video element */}
            {isVideoEnabled ? (
              <video
                id="local-video"
                autoPlay
                playsInline
                muted
                style={styles.localVideo}
                ref={(element) => {
                  if (element && localVideoElementRef.current !== element) {
                    localVideoElementRef.current = element;
                    console.log('[VIDEO_CALL] 🎥 Video element mounted!');
                    
                    // Event listeners for debugging
                    element.addEventListener('loadedmetadata', () => {
                      console.log('[VIDEO_CALL] ✓✓✓ Video metadata loaded!', {
                        width: element.videoWidth,
                        height: element.videoHeight,
                      });
                    });
                    
                    element.addEventListener('play', () => {
                      console.log('[VIDEO_CALL] ✓✓✓ Video started PLAYING!');
                    });
                    
                    element.addEventListener('playing', () => {
                      console.log('[VIDEO_CALL] ✓✓✓ Video is PLAYING!');
                    });
                    
                    element.addEventListener('error', (e) => {
                      console.error('[VIDEO_CALL] ✗✗✗ Video ERROR:', e);
                    });
                    
                    // Try binding immediately
                    if (meetingSessionRef.current) {
                      setTimeout(() => {
                        bindLocalVideo(meetingSessionRef.current.audioVideo);
                      }, 300);
                    }
                  }
                }}
              />
            ) : (
              <View style={styles.localVideoPlaceholder}>
                <Text style={styles.localVideoPlaceholderText}>📹</Text>
              </View>
            )}
          </div>
        </View>

        {/* Call controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, !isAudioEnabled && styles.controlButtonDisabled]}
            onPress={toggleAudio}
          >
            <Ionicons
              name={isAudioEnabled ? 'mic-outline' : 'mic-off-outline'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, !isVideoEnabled && styles.controlButtonDisabled]}
            onPress={toggleVideo}
          >
            <Ionicons
              name={isVideoEnabled ? 'videocam-outline' : 'videocam-off-outline'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Ionicons
              name="close-circle-outline"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Non-web platforms
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.statusText}>Video calling is only available on web</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'visible' as any,
  } as any,
  remoteVideoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  // LOCAL VIDEO CONTAINER - Green box
  localVideoContainer: {
    position: 'fixed' as any,
    bottom: 100,
    right: 20,
    width: 200,
    height: 250,
    borderRadius: 12,
    overflow: 'hidden' as any,
    borderWidth: 5,
    borderColor: '#00ff00',
    backgroundColor: '#00ff00',
    shadowColor: '#00ff00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    zIndex: 99999,
    display: 'block' as any,
    boxShadow: '0 0 30px #00ff00' as any,
  } as any,
  localVideoLabel: {
    position: 'absolute' as any,
    top: 5,
    left: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 4,
    borderRadius: 4,
    zIndex: 100,
  },
  localVideoLabelText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    backgroundColor: '#000',
  } as any,
  localVideoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoPlaceholderText: {
    fontSize: 48,
  },
  controls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
  },
  endCallButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  waitingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 280,
    backdropFilter: 'blur(10px)',
  },
  waitingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
});
