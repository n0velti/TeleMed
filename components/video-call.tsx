/**
 * Video Call Component
 * 
 * Handles Amazon Chime SDK video calling for appointments
 * 
 * Security:
 * - Verifies user is authorized to access the appointment
 * - Only allows users who are part of the appointment (patient or specialist) to join
 * 
 * Features:
 * - Real-time video and audio communication
 * - Mute/unmute controls
 * - Video on/off toggle
 * - Automatic attendee detection
 */

import { createMeetingSession } from '@/lib/chime';
import { useAuth } from '@/hooks/use-auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'expo-modules-core';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const client = generateClient<Schema>({ authMode: 'userPool' });

interface VideoCallProps {
  appointmentId?: string;
  onCallEnd?: () => void;
}

interface RemoteAttendee {
  attendeeId: string;
  email: string;
}

export function VideoCall({ appointmentId, onCallEnd }: VideoCallProps) {
  // State management
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteAttendee, setRemoteAttendee] = useState<RemoteAttendee | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(1);
  
  // Refs for Chime SDK session and video elements
  const meetingSessionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentAttendeeIdRef = useRef<string | null>(null);
  const observerRef = useRef<any>(null);
  
  // Auth hook
  const { userId } = useAuth();

  /**
   * Verify user is authorized to access this appointment
   * Only the patient (userId) or specialist (specialistId) can join
   */
  const verifyAuthorization = async (): Promise<boolean> => {
    if (!appointmentId) {
      console.error('[VIDEO_CALL] No appointment ID provided');
      return false;
    }

    if (!userId) {
      console.error('[VIDEO_CALL] User not authenticated');
      return false;
    }

    try {
      console.log('[VIDEO_CALL] Verifying authorization for appointment:', appointmentId);
      console.log('[VIDEO_CALL] Current user ID:', userId);
      
      const appointmentResponse = await client.models.Appointment.get({ id: appointmentId });
      const appointment = appointmentResponse.data;

      if (!appointment) {
        console.error('[VIDEO_CALL] Appointment not found:', appointmentId);
        return false;
      }

      // Check if user is the patient or the specialist
      const isPatient = appointment.userId === userId;
      const isSpecialist = appointment.specialistId === userId;

      // Log authorization check (avoid logging full appointment object)
      console.log('[VIDEO_CALL] Authorization check - isPatient:', isPatient, 'isSpecialist:', isSpecialist);

      if (!isPatient && !isSpecialist) {
        console.error('[VIDEO_CALL] User not authorized to access this appointment');
        return false;
      }

      console.log('[VIDEO_CALL] Authorization verified successfully');
      return true;
    } catch (err: any) {
      console.error('[VIDEO_CALL] Error verifying authorization:', err);
      return false;
    }
  };

  /**
   * Initialize Chime SDK meeting session
   */
  const initializeMeeting = async () => {
    try {
      console.log('[VIDEO_CALL] Starting meeting initialization');
      console.log('[VIDEO_CALL] Appointment ID:', appointmentId);

      // Step 1: Get meeting credentials
      console.log('[VIDEO_CALL] Step 1: Fetching meeting credentials...');
      const credentials = await createMeetingSession(appointmentId);
      
      if (!credentials) {
        throw new Error('Failed to get meeting credentials');
      }

      // Validate credentials
      if (!credentials.meetingInfo?.meetingId) {
        throw new Error('Invalid credentials: missing meetingId');
      }
      if (!credentials.attendeeInfo?.attendeeId) {
        throw new Error('Invalid credentials: missing attendeeId');
      }
      if (!credentials.attendeeInfo?.joinToken) {
        throw new Error('Invalid credentials: missing joinToken');
      }
      if (!credentials.meetingInfo?.mediaPlacement) {
        throw new Error('Invalid credentials: missing mediaPlacement');
      }

      // Log essential info only (avoid logging full credentials object)
      console.log('[VIDEO_CALL] Credentials received');
      console.log('[VIDEO_CALL] Meeting ID:', credentials.meetingInfo.meetingId);
      console.log('[VIDEO_CALL] Attendee ID:', credentials.attendeeInfo.attendeeId);

      // Step 2: Load Chime SDK
      console.log('[VIDEO_CALL] Step 2: Loading Chime SDK...');
      const chimeSDK = await import('@/lib/chime-sdk-web').then(m => m.loadChimeSDK());
      const {
        DefaultMeetingSession,
        DefaultDeviceController,
        MeetingSessionConfiguration,
        LogLevel,
        ConsoleLogger,
      } = chimeSDK;

      // Step 3: Create meeting configuration
      console.log('[VIDEO_CALL] Step 3: Creating meeting configuration...');
      const mediaPlacement = credentials.meetingInfo.mediaPlacement;
      
      const configObject = {
        Meeting: {
          MeetingId: credentials.meetingInfo.meetingId,
          MediaRegion: credentials.meetingInfo.mediaRegion || 'us-east-1',
          MediaPlacement: {
            AudioHostUrl: mediaPlacement.audioHostUrl,
            AudioFallbackUrl: mediaPlacement.audioFallbackUrl || '',
            SignalingUrl: mediaPlacement.signalingUrl,
            TurnControlUrl: mediaPlacement.turnControlUrl,
            ScreenDataUrl: mediaPlacement.screenDataUrl || '',
            ScreenViewingUrl: mediaPlacement.screenViewingUrl || '',
            ScreenSharingUrl: mediaPlacement.screenSharingUrl || '',
            EventIngestionUrl: mediaPlacement.eventIngestionUrl || '',
          },
        },
        Attendee: {
          AttendeeId: credentials.attendeeInfo.attendeeId,
          ExternalUserId: credentials.attendeeInfo.externalUserId || userId || '',
          JoinToken: credentials.attendeeInfo.joinToken,
        },
      };

      // Step 4: Create meeting session
      console.log('[VIDEO_CALL] Step 4: Creating meeting session...');
      const logger = new ConsoleLogger('VideoCall', LogLevel.WARN);
      const deviceController = new DefaultDeviceController(logger);
      const configuration = new MeetingSessionConfiguration(configObject);
      const session = new DefaultMeetingSession(configuration, logger, deviceController);

      meetingSessionRef.current = session;
      currentAttendeeIdRef.current = credentials.attendeeInfo.attendeeId;

      console.log('[VIDEO_CALL] Meeting session created');

      // Step 5: Set up observers
      console.log('[VIDEO_CALL] Step 5: Setting up observers...');
      const observer: any = {
        // Handle video tile updates
        videoTileDidUpdate: (tileState: any) => {
          const attendeeId = tileState.boundAttendeeId;
          const isLocal = tileState.localTile === true || attendeeId === currentAttendeeIdRef.current;

          if (isLocal && localVideoRef.current && tileState.tileId !== null) {
            try {
              session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
              console.log('[VIDEO_CALL] Local video bound');
            } catch (e) {
              console.error('[VIDEO_CALL] Error binding local video:', e);
            }
          } else if (!isLocal && attendeeId && remoteVideoRef.current && tileState.tileId !== null) {
            console.log('[VIDEO_CALL] Remote video tile detected:', attendeeId);
            
            // Subscribe to remote video
            const audioVideoAny = session.audioVideo as any;
            if (audioVideoAny.startRemoteVideo) {
              audioVideoAny.startRemoteVideo(attendeeId)
                .then(() => {
                  console.log('[VIDEO_CALL] Subscribed to remote video:', attendeeId);
                  if (tileState.tileId !== null && remoteVideoRef.current) {
                    session.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                    console.log('[VIDEO_CALL] Remote video bound');
                  }
                })
                .catch((err: any) => {
                  console.error('[VIDEO_CALL] Error subscribing to remote video:', err);
                });
            } else {
              // Fallback: try binding directly
              try {
                session.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
              } catch (e) {
                console.error('[VIDEO_CALL] Error binding remote video:', e);
              }
            }

            // Update remote attendee info
            const externalUserId = tileState.boundExternalUserId;
            if (externalUserId) {
              setRemoteAttendee({ attendeeId, email: externalUserId });
              console.log('[VIDEO_CALL] Remote attendee set:', externalUserId);
            }
          }
        },

        // Handle video tile removal
        videoTileWasRemoved: (tileId: number) => {
          console.log('[VIDEO_CALL] Video tile removed:', tileId);
          const allTiles = session.audioVideo.getAllVideoTiles();
          const hasRemoteTile = allTiles.some((tile: any) => {
            const state = tile.state();
            return state && !state.localTile && state.boundAttendeeId !== currentAttendeeIdRef.current;
          });
          
          if (!hasRemoteTile) {
            setRemoteAttendee(null);
            setAttendeeCount(1);
            console.log('[VIDEO_CALL] Remote attendee left');
          }
        },

        // Handle attendee presence changes
        attendeeDidPresenceChange: (presence: any, attendeeId: string) => {
          const isSelf = attendeeId === currentAttendeeIdRef.current;
          // Log presence change (avoid logging full presence object)
          console.log('[VIDEO_CALL] Attendee presence changed:', attendeeId, 'present:', presence.present, 'isSelf:', isSelf);

          if (presence.present && !isSelf) {
            setAttendeeCount(2);
            const audioVideoAny = session.audioVideo as any;
            const realtimeController = audioVideoAny.realtimeController;
            if (realtimeController) {
              const externalUserId = realtimeController.getAttendeeExternalUserId?.(attendeeId);
              if (externalUserId) {
                setRemoteAttendee({ attendeeId, email: externalUserId });
                console.log('[VIDEO_CALL] Remote attendee joined:', externalUserId);
              }
            }
          } else if (!presence.present && !isSelf) {
            setAttendeeCount(1);
            setRemoteAttendee(null);
            console.log('[VIDEO_CALL] Remote attendee left');
          }
        },

        // Handle remote video sources
        remoteVideoSourcesDidChange: (videoSources: any[]) => {
          console.log('[VIDEO_CALL] Remote video sources changed:', videoSources.length);
          
          if (videoSources && videoSources.length > 0) {
            const remoteCount = videoSources.filter((source: any) => 
              source.attendeeId && source.attendeeId !== currentAttendeeIdRef.current
            ).length;
            setAttendeeCount(remoteCount + 1);

            const audioVideoAny = session.audioVideo as any;
            for (const source of videoSources) {
              if (source.attendeeId && source.attendeeId !== currentAttendeeIdRef.current) {
                // Subscribe to remote video
                if (audioVideoAny.startRemoteVideo) {
                  audioVideoAny.startRemoteVideo(source.attendeeId).catch((err: any) => {
                    console.log('[VIDEO_CALL] Error subscribing to video source:', err);
                  });
                }
                
                // Update remote attendee info
                if (source.externalUserId) {
                  setRemoteAttendee({ attendeeId: source.attendeeId, email: source.externalUserId });
                }
              }
            }
          }
        },
      };

      session.audioVideo.addObserver(observer);
      observerRef.current = observer;
      console.log('[VIDEO_CALL] Observers registered');

      // Step 6: Start session
      console.log('[VIDEO_CALL] Step 6: Starting session...');
      await session.audioVideo.start();
      console.log('[VIDEO_CALL] Session started');

      // Step 7: Enable audio
      console.log('[VIDEO_CALL] Step 7: Enabling audio...');
      try {
        const audioDevices = await session.audioVideo.listAudioInputDevices();
        if (audioDevices.length > 0) {
          await session.audioVideo.chooseAudioInputDevice(audioDevices[0].deviceId);
        }
        session.audioVideo.realtimeUnmuteLocalAudio();
        console.log('[VIDEO_CALL] Audio enabled');
      } catch (audioErr) {
        console.error('[VIDEO_CALL] Error enabling audio:', audioErr);
      }

      // Step 8: Enable video
      console.log('[VIDEO_CALL] Step 8: Enabling video...');
      try {
        const devices = await session.audioVideo.listVideoInputDevices();
        if (devices.length > 0) {
          await session.audioVideo.startVideoInput(devices[0].deviceId);
          await session.audioVideo.startLocalVideoTile();
          
          // Bind local video after a short delay
          setTimeout(() => {
            const localTile = session.audioVideo.getLocalVideoTile();
            if (localTile && localVideoRef.current) {
              const tileState = localTile.state();
              if (tileState && tileState.active && tileState.tileId !== null) {
                session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
                console.log('[VIDEO_CALL] Local video bound');
              }
            }
          }, 500);
        }
        console.log('[VIDEO_CALL] Video enabled');
      } catch (videoErr) {
        console.error('[VIDEO_CALL] Error enabling video:', videoErr);
      }

      setIsConnecting(false);
      console.log('[VIDEO_CALL] Meeting initialization complete');
    } catch (err: any) {
      console.error('[VIDEO_CALL] Meeting initialization failed:', err);
      setError(err.message || 'Failed to start video call');
      setIsConnecting(false);
    }
  };

  // Main effect: Initialize meeting
  useEffect(() => {
    // Check platform
    if (Platform.OS !== 'web') {
      setError('Video calling is only available on web');
      setIsConnecting(false);
      return;
    }

    // Check authentication
    if (!userId) {
      setError('You must be logged in to join a video call');
      setIsConnecting(false);
      return;
    }

    // Check appointment ID
    if (!appointmentId) {
      setError('Invalid appointment ID');
      setIsConnecting(false);
      return;
    }

    // Initialize meeting
    const init = async () => {
      try {
        // Step 1: Verify authorization
        setIsAuthorizing(true);
        const authorized = await verifyAuthorization();
        
        if (!authorized) {
          setError('You are not authorized to access this appointment');
          setIsAuthorizing(false);
          setIsConnecting(false);
          return;
        }

        setIsAuthorizing(false);
        
        // Step 2: Initialize meeting
        await initializeMeeting();
      } catch (err: any) {
        console.error('[VIDEO_CALL] Initialization error:', err);
        setError(err.message || 'Failed to initialize video call');
        setIsAuthorizing(false);
        setIsConnecting(false);
      }
    };

    init();

    // Cleanup function
    return () => {
      console.log('[VIDEO_CALL] Cleaning up...');
      
      if (meetingSessionRef.current) {
        const session = meetingSessionRef.current;
        try {
          session.audioVideo.stopLocalVideoTile();
          session.audioVideo.stop();
          if (observerRef.current) {
            session.audioVideo.removeObserver(observerRef.current);
          }
        } catch (e) {
          console.error('[VIDEO_CALL] Cleanup error:', e);
        }
        meetingSessionRef.current = null;
      }
      
      currentAttendeeIdRef.current = null;
      observerRef.current = null;
    };
  }, [appointmentId, userId]);

  // Toggle audio mute/unmute
  const toggleAudio = () => {
    if (!meetingSessionRef.current) return;
    
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    
    try {
      if (newState) {
        meetingSessionRef.current.audioVideo.realtimeUnmuteLocalAudio();
        console.log('[VIDEO_CALL] Audio unmuted');
      } else {
        meetingSessionRef.current.audioVideo.realtimeMuteLocalAudio();
        console.log('[VIDEO_CALL] Audio muted');
      }
    } catch (err) {
      console.error('[VIDEO_CALL] Error toggling audio:', err);
    }
  };

  // Toggle video on/off
  const toggleVideo = async () => {
    if (!meetingSessionRef.current) return;
    
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    const session = meetingSessionRef.current;
    
    try {
      if (newState) {
        await session.audioVideo.startLocalVideoTile();
        setTimeout(() => {
          const localTile = session.audioVideo.getLocalVideoTile();
          if (localTile && localVideoRef.current) {
            const tileState = localTile.state();
            if (tileState && tileState.tileId !== null) {
              session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
            }
          }
        }, 300);
        console.log('[VIDEO_CALL] Video enabled');
      } else {
        session.audioVideo.stopLocalVideoTile();
        console.log('[VIDEO_CALL] Video disabled');
      }
    } catch (err) {
      console.error('[VIDEO_CALL] Error toggling video:', err);
    }
  };

  // End call
  const endCall = () => {
    console.log('[VIDEO_CALL] Ending call...');
    
    if (meetingSessionRef.current) {
      const session = meetingSessionRef.current;
      try {
        session.audioVideo.stopLocalVideoTile();
        session.audioVideo.stop();
        if (observerRef.current) {
          session.audioVideo.removeObserver(observerRef.current);
        }
      } catch (e) {
        console.error('[VIDEO_CALL] Error ending call:', e);
      }
      meetingSessionRef.current = null;
    }
    
    currentAttendeeIdRef.current = null;
    observerRef.current = null;
    onCallEnd?.();
  };

  // Error state
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.button} onPress={endCall}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Platform check
  if (Platform.OS !== 'web') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Video calling is only available on web</ThemedText>
      </ThemedView>
    );
  }

  // Render video call UI
  return (
    <View style={styles.container}>
      {/* Remote Video (Main View) */}
      <div style={styles.remoteVideoContainer}>
        <video
          ref={(el) => {
            if (el) remoteVideoRef.current = el;
          }}
          autoPlay
          playsInline
          style={styles.remoteVideo}
        />
        
        {/* Remote Attendee Email Overlay */}
        {remoteAttendee && (
          <View style={styles.emailOverlay}>
            <Text style={styles.emailText}>{remoteAttendee.email}</Text>
          </View>
        )}

        {/* Loading/Connecting Overlay */}
        {(isAuthorizing || isConnecting) && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.overlayText}>
              {isAuthorizing ? 'Verifying access...' : 'Connecting...'}
            </Text>
          </View>
        )}

        {/* Waiting for Participants Overlay */}
        {!isConnecting && !remoteAttendee && attendeeCount < 2 && (
          <View style={styles.waitingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.waitingText}>Waiting for other participant...</Text>
            <Text style={styles.waitingSubtext}>You are alone in the room</Text>
          </View>
        )}
      </div>

      {/* Local Video (Bottom Right) */}
      {isVideoEnabled && (
        <div style={styles.localVideoContainer}>
          <video
            ref={(el) => {
              if (el) localVideoRef.current = el;
            }}
            autoPlay
            playsInline
            muted
            style={styles.localVideo}
          />
          <View style={styles.localVideoLabel}>
            <Text style={styles.localVideoLabelText}>You</Text>
          </View>
        </div>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, !isAudioEnabled && styles.controlButtonMuted]}
          onPress={toggleAudio}
        >
          <Ionicons
            name={isAudioEnabled ? 'mic' : 'mic-off'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, !isVideoEnabled && styles.controlButtonMuted]}
          onPress={toggleVideo}
        >
          <Ionicons
            name={isVideoEnabled ? 'videocam' : 'videocam-off'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.endButton]}
          onPress={endCall}
        >
          <Ionicons name="call" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
  } as any,
  remoteVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  emailOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  emailText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  overlayText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  waitingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  waitingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  localVideoContainer: {
    position: 'fixed',
    bottom: 100,
    right: 20,
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#00ff00',
    backgroundColor: '#000',
    zIndex: 999,
  } as any,
  localVideo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as any,
  localVideoLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1000,
  },
  localVideoLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    zIndex: 100,
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
  controlButtonMuted: {
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
  },
  endButton: {
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
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 24,
  },
});
