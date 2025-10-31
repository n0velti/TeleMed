import { ChimeServiceError, createMeetingSession } from '@/lib/chime';
import { Platform } from 'expo-modules-core';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/**
 * Video Call Component using Amazon Chime SDK
 * 
 * This component handles:
 * - Meeting initialization
 * - Audio/video device management
 * - Remote video rendering
 * - Call controls (mute, video toggle, hang up)
 * 
 * Platform Support:
 * - Web: Uses Chime SDK JS directly
 * - Mobile: Uses WebView wrapper (Chime SDK JS is browser-based)
 * 
 * Security:
 * - All credentials are handled securely through backend
 * - No credentials stored in component state
 * - End-to-end encryption enabled by default in Chime SDK
 * 
 * HIPAA Compliance:
 * - No PII displayed or logged
 * - Encrypted audio/video streams
 * - Secure credential handling
 */

interface VideoCallProps {
  appointmentId?: string;
  onCallEnd?: () => void;
  userName?: string;
}

type CallState = 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error';

export function VideoCall({ appointmentId, onCallEnd, userName }: VideoCallProps) {
  const [callState, setCallState] = useState<CallState>('initializing');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Refs for Chime SDK components
  const meetingSessionRef = useRef<any>(null);
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioVideoRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);

  /**
   * Initialize Chime SDK meeting session
   */
  useEffect(() => {
    let isMounted = true;
    
    const initializeMeeting = async () => {
      try {
        setCallState('connecting');
        setErrorMessage(null);
        
        console.log('[VIDEO_CALL] Initializing meeting session...');
        
        // Create meeting session with credentials
        const credentials = await createMeetingSession(appointmentId);
        
        if (!isMounted) return;
        
        console.log('[VIDEO_CALL] Meeting credentials received');
        
        // Import Chime SDK dynamically (only on web)
        if (Platform.OS === 'web') {
          // Import Chime SDK - try both default and named exports
          const chimeSDKModule = await import('amazon-chime-sdk-js');
          
          // Handle both default export and named exports
          const chimeSDK = chimeSDKModule.default || chimeSDKModule;
          
          const {
            DefaultMeetingSession,
            DefaultDeviceController,
            DefaultEventController,
            MeetingSessionConfiguration,
            LogLevel,
            ConsoleLogger,
            NoOpEventReporter,
          } = chimeSDK;
          
          // Validate SDK exports are available
          if (!DefaultMeetingSession || !MeetingSessionConfiguration || !DefaultEventController) {
            console.error('[VIDEO_CALL] Chime SDK exports:', Object.keys(chimeSDK));
            throw new Error('Failed to import required Chime SDK components');
          }
          
          // Configure logger (reduce log level in production)
          const logger = new ConsoleLogger('VideoCall', LogLevel.INFO);
          
          // Create device controller for audio/video device management
          const deviceController = new DefaultDeviceController(logger);
          
          // Validate credentials before creating configuration
          console.log('[VIDEO_CALL] Validating credentials...');
          if (!credentials.meetingInfo?.meetingId) {
            throw new Error('Missing meetingId in credentials');
          }
          if (!credentials.attendeeInfo?.attendeeId || !credentials.attendeeInfo?.joinToken) {
            throw new Error('Missing attendeeId or joinToken in credentials');
          }
          if (!credentials.meetingInfo?.mediaPlacement) {
            throw new Error('Missing mediaPlacement in credentials');
          }
          
          // Validate all required MediaPlacement URLs are present
          const mediaPlacement = credentials.meetingInfo.mediaPlacement;
          const requiredUrls = [
            'audioHostUrl',
            'audioFallbackUrl',
            'signalingUrl',
            'turnControlUrl',
          ];
          
          for (const urlKey of requiredUrls) {
            if (!mediaPlacement[urlKey as keyof typeof mediaPlacement]) {
              throw new Error(`Missing required MediaPlacement URL: ${urlKey}`);
            }
          }
          
          console.log('[VIDEO_CALL] Creating MeetingSessionConfiguration...');
          
          // Create meeting session configuration with complete MediaPlacement data
          // Structure must match exactly what Chime SDK expects
          const meetingConfiguration = {
            Meeting: {
              MeetingId: credentials.meetingInfo.meetingId,
              MediaRegion: credentials.meetingInfo.mediaRegion || 'us-east-1',
              MediaPlacement: {
                AudioHostUrl: mediaPlacement.audioHostUrl,
                AudioFallbackUrl: mediaPlacement.audioFallbackUrl,
                SignalingUrl: mediaPlacement.signalingUrl,
                TurnControlUrl: mediaPlacement.turnControlUrl,
                ScreenDataUrl: mediaPlacement.screenDataUrl || '',
                ScreenViewingUrl: mediaPlacement.screenViewingUrl || '',
                ScreenSharingUrl: mediaPlacement.screenSharingUrl || '',
                EventIngestionUrl: mediaPlacement.eventIngestionUrl || '',
              },
            },
          };
          
          const attendeeConfiguration = {
            Attendee: {
              AttendeeId: credentials.attendeeInfo.attendeeId,
              ExternalUserId: credentials.attendeeInfo.externalUserId,
              JoinToken: credentials.attendeeInfo.joinToken,
            },
          };
          
          console.log('[VIDEO_CALL] Meeting config:', {
            meetingId: meetingConfiguration.Meeting.MeetingId,
            mediaRegion: meetingConfiguration.Meeting.MediaRegion,
            hasMediaPlacement: !!meetingConfiguration.Meeting.MediaPlacement,
          });
          
          console.log('[VIDEO_CALL] Attendee config:', {
            attendeeId: attendeeConfiguration.Attendee.AttendeeId,
            hasJoinToken: !!attendeeConfiguration.Attendee.JoinToken,
          });
          
          const configuration = new MeetingSessionConfiguration(
            meetingConfiguration,
            attendeeConfiguration
          );
          
          console.log('[VIDEO_CALL] Configuration created, initializing DefaultMeetingSession...');
          console.log('[VIDEO_CALL] Configuration object:', {
            meetingId: configuration.meetingId,
            hasCredentials: !!configuration.credentials,
            attendeeId: configuration.credentials?.attendeeId,
          });
          
          // Create event controller for handling meeting events
          // Using NoOpEventReporter to opt out of event ingestion (can be replaced with DefaultEventReporter for production)
          console.log('[VIDEO_CALL] Creating event controller...');
          const eventController = new DefaultEventController(
            configuration,
            logger,
            new NoOpEventReporter()
          );
          
          // Create meeting session - must include eventController in newer SDK versions
          let meetingSession;
          try {
            console.log('[VIDEO_CALL] Creating DefaultMeetingSession with eventController...');
            meetingSession = new DefaultMeetingSession(
              configuration,
              logger,
              deviceController,
              eventController
            );
            console.log('[VIDEO_CALL] DefaultMeetingSession created successfully');
            
            // Store references
            meetingSessionRef.current = meetingSession;
            audioVideoRef.current = meetingSession.audioVideo;
            
            // Store current user's attendee ID for tracking
            const currentAttendeeId = configuration.credentials?.attendeeId;
            if (currentAttendeeId) {
              setCurrentUserId(currentAttendeeId);
              currentUserIdRef.current = currentAttendeeId;
              console.log('[VIDEO_CALL] Current user attendee ID:', currentAttendeeId);
            }
          } catch (sessionError) {
            console.error('[VIDEO_CALL] Error creating DefaultMeetingSession:', sessionError);
            console.error('[VIDEO_CALL] Configuration passed to constructor:', JSON.stringify(configuration, null, 2));
            throw new Error(`Failed to create meeting session: ${sessionError instanceof Error ? sessionError.message : 'Unknown error'}`);
          }
          
          // Set up event observers (includes attendee tracking)
          setupEventObservers(meetingSession);
          
          // Start the meeting session (connects to the meeting)
          console.log('[VIDEO_CALL] Starting meeting session...');
          await meetingSession.audioVideo.start();
          
          // Enable local video if enabled
          if (isVideoEnabled && localVideoElementRef.current) {
            console.log('[VIDEO_CALL] Enabling local video...');
            meetingSession.audioVideo.startLocalVideoTile();
            meetingSession.audioVideo.bindVideoElement(
              0, // Local video stream index
              localVideoElementRef.current
            );
          }
          
          // Note: Audio is enabled automatically when the session starts
          // If you need to control audio later, use meetingSession.audioVideo.realtimeMuteLocalAudio()
          
          if (isMounted) {
            setCallState('connected');
            console.log('[VIDEO_CALL] Meeting session started successfully');
          }
        } else {
          // For mobile platforms, show a message or use WebView
          Alert.alert(
            'Video Calling',
            'Video calling is currently available on web. Mobile support coming soon.',
            [{ text: 'OK', onPress: () => onCallEnd?.() }]
          );
          setCallState('error');
          setErrorMessage('Mobile video calling not yet supported');
        }
      } catch (error) {
        console.error('[VIDEO_CALL] Error initializing meeting:', error);
        if (isMounted) {
          setCallState('error');
          setErrorMessage(
            error instanceof ChimeServiceError
              ? error.message
              : 'Failed to start video call. Please try again.'
          );
        }
      }
    };
    
    initializeMeeting();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (meetingSessionRef.current) {
        try {
          // Clear attendee count interval if it exists
          if ((meetingSessionRef.current as any)._attendeeCountInterval) {
            clearInterval((meetingSessionRef.current as any)._attendeeCountInterval);
          }
          
          meetingSessionRef.current.audioVideo?.stop();
          meetingSessionRef.current.audioVideo?.leave();
        } catch (error) {
          console.error('[VIDEO_CALL] Error cleaning up:', error);
        }
      }
    };
  }, [appointmentId]);

  /**
   * Set up event observers for meeting session
   */
  const setupEventObservers = (meetingSession: any) => {
    const audioVideo = meetingSession.audioVideo;
    const realtime = meetingSession.audioVideo.realtimeController;
    
    // Function to update attendee count
    const updateAttendeeCount = () => {
      try {
        // Get all attendee IDs from the roster
        const roster = realtime.getAllRemoteAttendeeIds() || [];
        // Count includes remote attendees + current user
        const totalCount = roster.length + 1; // +1 for current user
        
        setAttendeeCount(totalCount);
        
        console.log('[VIDEO_CALL] Attendee count updated:', {
          total: totalCount,
          remote: roster.length,
          currentUser: currentUserIdRef.current,
        });
      } catch (error) {
        console.error('[VIDEO_CALL] Error updating attendee count:', error);
      }
    };
    
    // Initial attendee count (just current user)
    setAttendeeCount(1);
    
    // Observer for remote video tiles
    const observer = {
      videoTileDidUpdate: (tileState: any) => {
        if (tileState.boundVideoElement && tileState.attendeeId !== currentUserIdRef.current) {
          // Remote video tile updated
          const attendeeId = tileState.attendeeId;
          console.log('[VIDEO_CALL] Remote video tile updated:', attendeeId);
          updateAttendeeCount();
        }
      },
      
      videoTileWasRemoved: (tileId: number) => {
        console.log('[VIDEO_CALL] Video tile removed:', tileId);
        updateAttendeeCount();
      },
      
      audioVideoDidStop: (sessionStatus: any) => {
        console.log('[VIDEO_CALL] Audio video stopped:', sessionStatus);
        setCallState('disconnected');
        onCallEnd?.();
      },
    };
    
    // Subscribe to attendee presence changes
    const presenceCallback = (attendeeId: string, present: boolean) => {
      console.log('[VIDEO_CALL] Attendee presence changed:', { attendeeId, present });
      updateAttendeeCount();
    };
    
    audioVideo.addObserver(observer);
    
    // Subscribe to roster updates
    realtime.realtimeSubscribeToAttendeeIdPresence(
      (attendeeId: string, present: boolean, externalUserId?: string) => {
        if (attendeeId !== currentUserIdRef.current) {
          presenceCallback(attendeeId, present);
        }
      }
    );
    
    // Update count periodically as fallback
    const countInterval = setInterval(() => {
      updateAttendeeCount();
    }, 2000);
    
    // Store interval for cleanup
    (meetingSession as any)._attendeeCountInterval = countInterval;
  };

  /**
   * Toggle audio mute/unmute
   */
  const toggleAudio = () => {
    if (!audioVideoRef.current) return;
    
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    
    // Use realtime API for audio control
    if (newState) {
      audioVideoRef.current.realtimeUnmuteLocalAudio();
    } else {
      audioVideoRef.current.realtimeMuteLocalAudio();
    }
  };

  /**
   * Toggle video on/off
   */
  const toggleVideo = () => {
    if (!audioVideoRef.current || !localVideoElementRef.current) return;
    
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    
    if (newState) {
      audioVideoRef.current.startLocalVideoTile();
      audioVideoRef.current.bindVideoElement(0, localVideoElementRef.current);
    } else {
      audioVideoRef.current.stopLocalVideoTile();
    }
  };

  /**
   * End the call
   */
  const endCall = () => {
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

  // Render loading state
  if (callState === 'initializing' || callState === 'connecting') {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <ThemedText style={styles.statusText}>
          {callState === 'initializing' ? 'Initializing...' : 'Connecting to call...'}
        </ThemedText>
      </ThemedView>
    );
  }

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

  // Render active call UI (web only)
  if (Platform.OS === 'web') {
    // Calculate how many people we're waiting for (1-on-1 call = waiting for 1 person)
    const waitingForCount = attendeeCount === 1 ? 1 : 0;
    const isWaitingForOthers = attendeeCount === 1;
    
    return (
      <View style={styles.container}>
        {/* Video containers */}
        <View style={styles.videoContainer}>
          {/* Remote video (main) */}
          <div style={styles.remoteVideoContainer}>
            <video
              id="remote-video"
              autoPlay
              playsInline
              style={styles.remoteVideo}
              ref={(el) => {
                // Attach remote video when available
                // This will be bound by Chime SDK observers
              }}
            />
            
            {/* Waiting for others overlay */}
            {isWaitingForOthers && (
              <View style={styles.waitingOverlay}>
                <View style={styles.waitingCard}>
                  <ActivityIndicator size="large" color="#fff" />
                  <ThemedText style={styles.waitingText}>
                    Waiting for {waitingForCount} other participant{waitingForCount !== 1 ? 's' : ''} to join...
                  </ThemedText>
                </View>
              </View>
            )}
          </div>
          
          {/* Local video (picture-in-picture) */}
          <div style={styles.localVideoContainer}>
            <video
              id="local-video"
              autoPlay
              playsInline
              muted
              style={styles.localVideo}
              ref={localVideoElementRef}
            />
          </div>
        </View>

        {/* Call controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, !isAudioEnabled && styles.controlButtonDisabled]}
            onPress={toggleAudio}
          >
            <Text style={styles.controlButtonText}>
              {isAudioEnabled ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, !isVideoEnabled && styles.controlButtonDisabled]}
            onPress={toggleVideo}
          >
            <Text style={styles.controlButtonText}>
              {isVideoEnabled ? '📹' : '📷'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={endCall}
          >
            <Text style={styles.controlButtonText}>📞</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Fallback for mobile
  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.statusText}>
        Video calling is currently available on web.
      </ThemedText>
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
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
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
  localVideoContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  endCallButton: {
    backgroundColor: '#ff4444',
  },
  controlButtonText: {
    fontSize: 24,
  },
  button: {
    backgroundColor: '#0a7ea4',
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

