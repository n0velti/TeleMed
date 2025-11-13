/**
 * Video Call Component - AWS Chime SDK
 * 
 * Implementation following AWS Chime SDK best practices
 * Based on official AWS documentation and examples
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

const dataClient = generateClient<Schema>({ authMode: 'userPool' });

interface VideoCallProps {
  appointmentId?: string;
  onCallEnd?: () => void;
}

export function VideoCall({ appointmentId, onCallEnd }: VideoCallProps) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteAttendee, setRemoteAttendee] = useState<string | null>(null);
  const [waitingForAttendee, setWaitingForAttendee] = useState(false);

  const sessionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const attendeeIdRef = useRef<string | null>(null);
  const observerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  
  const { userId } = useAuth();

  // Verify authorization
  const checkAuth = async (): Promise<boolean> => {
    try {
      if (!appointmentId || !userId) return false;
      const appointment = await dataClient.models.Appointment.get({ id: appointmentId });
      const apt = appointment.data;
      if (!apt) return false;
      return apt.userId === userId || apt.specialistId === userId;
    } catch {
      return false;
    }
  };

  // Initialize meeting
  useEffect(() => {
    mountedRef.current = true;

    if (Platform.OS !== 'web') {
      setError('Video calling is only available on web');
      setConnecting(false);
      return;
    }

    const init = async () => {
      try {
        // Validate inputs
        if (!appointmentId) {
          throw new Error('Appointment ID is required');
        }
        if (!userId) {
          throw new Error('User not authenticated');
        }

        // Check authorization
        const authorized = await checkAuth();
        if (!authorized) {
          throw new Error('Not authorized to access this appointment');
        }
        if (!mountedRef.current) return;

        // Get credentials
        const credentials = await createMeetingSession(appointmentId);
        if (!mountedRef.current) return;

        // Validate credentials structure
        if (!credentials || !credentials.meetingInfo || !credentials.attendeeInfo) {
          throw new Error('Invalid credentials structure');
        }

        const { meetingInfo, attendeeInfo } = credentials;

        // Extract and validate all required fields
        const meetingId = meetingInfo?.meetingId;
        const attendeeId = attendeeInfo?.attendeeId;
        const joinToken = attendeeInfo?.joinToken;
        const externalUserId = attendeeInfo?.externalUserId || userId || '';
        const mediaRegion = meetingInfo?.mediaRegion || 'us-east-1';
        const mediaPlacement = meetingInfo?.mediaPlacement;

        if (!meetingId || typeof meetingId !== 'string' || meetingId.trim() === '') {
          throw new Error('Invalid meetingId');
        }
        if (!attendeeId || typeof attendeeId !== 'string' || attendeeId.trim() === '') {
          throw new Error('Invalid attendeeId');
        }
        if (!joinToken || typeof joinToken !== 'string' || joinToken.trim() === '') {
          throw new Error('Invalid joinToken');
        }
        if (!mediaPlacement || typeof mediaPlacement !== 'object') {
          throw new Error('Invalid mediaPlacement');
        }

        // Validate MediaPlacement required fields
        const requiredFields = [
          'audioHostUrl',
          'audioFallbackUrl',
          'signalingUrl',
          'turnControlUrl',
        ];

        for (const field of requiredFields) {
          if (!mediaPlacement[field] || typeof mediaPlacement[field] !== 'string') {
            throw new Error(`Missing or invalid MediaPlacement.${field}`);
          }
        }

        if (!mountedRef.current) return;

        // Load Chime SDK
        const chimeModule = await import('@/lib/chime-sdk-web');
        const chimeSDK = await chimeModule.loadChimeSDK();

        if (!chimeSDK) {
          throw new Error('Failed to load Chime SDK');
        }

        const {
          DefaultMeetingSession,
          DefaultDeviceController,
          MeetingSessionConfiguration,
          LogLevel,
          ConsoleLogger,
        } = chimeSDK;

        if (!DefaultMeetingSession || !MeetingSessionConfiguration || !DefaultDeviceController) {
          throw new Error('Chime SDK classes not available');
        }

        // Create MeetingSessionConfiguration following AWS SDK structure
        // The SDK expects a single object with Meeting and Attendee properties
        const configurationObject = {
          Meeting: {
            MeetingId: meetingId,
            MediaRegion: mediaRegion,
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
          Attendee: {
            AttendeeId: attendeeId,
            ExternalUserId: externalUserId,
            JoinToken: joinToken,
          },
        };

        // Create configuration object exactly as SDK expects
        const configuration = new MeetingSessionConfiguration(configurationObject);

        if (!configuration) {
          throw new Error('Failed to create MeetingSessionConfiguration');
        }

        // Create logger and device controller
        const logger = new ConsoleLogger('VideoCall', LogLevel.INFO);
        const deviceController = new DefaultDeviceController(logger);

        // Create meeting session
        const session = new DefaultMeetingSession(configuration, logger, deviceController);

        if (!session || !session.audioVideo) {
          throw new Error('Failed to create meeting session');
        }

        sessionRef.current = session;
        attendeeIdRef.current = attendeeId;

        // Set up observer
        const observer: any = {
          videoTileDidUpdate: (tileState: any) => {
            if (!mountedRef.current || !tileState || !sessionRef.current) return;

            const isLocal = tileState.localTile === true || 
                          (tileState.boundAttendeeId === attendeeIdRef.current);

            if (isLocal && localVideoRef.current && tileState.tileId !== null) {
              try {
                sessionRef.current.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
              } catch (err) {
                // Ignore binding errors
              }
            } else if (!isLocal && remoteVideoRef.current && tileState.tileId !== null && tileState.boundAttendeeId) {
              try {
                sessionRef.current.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                if (tileState.boundExternalUserId) {
                  setRemoteAttendee(tileState.boundExternalUserId);
                  setWaitingForAttendee(false);
                }
              } catch (err) {
                // Ignore binding errors
              }
            }
          },

          videoTileWasRemoved: (tileState: any) => {
            if (mountedRef.current && tileState && tileState.boundAttendeeId === attendeeIdRef.current) {
              setRemoteAttendee(null);
              setWaitingForAttendee(true);
            }
          },

          attendeeDidPresenceChange: (presence: any, attendeeId: string) => {
            if (!mountedRef.current || !presence || !attendeeId) return;
            if (attendeeId === attendeeIdRef.current) return;

            if (presence.present) {
              setRemoteAttendee(attendeeId);
              setWaitingForAttendee(false);
            } else {
              setRemoteAttendee(null);
              setWaitingForAttendee(true);
            }
          },
        };

        session.audioVideo.addObserver(observer);
        observerRef.current = observer;

        // Start session
        await session.audioVideo.start();
        if (!mountedRef.current) return;

        // Enable audio
        try {
          const audioDevices = await session.audioVideo.listAudioInputDevices();
          if (audioDevices.length > 0) {
            await session.audioVideo.chooseAudioInputDevice(audioDevices[0].deviceId);
            session.audioVideo.realtimeUnmuteLocalAudio();
          }
        } catch (err) {
          // Continue if audio fails
        }

        // Enable video
        try {
          const videoDevices = await session.audioVideo.listVideoInputDevices();
          if (videoDevices.length > 0) {
            await session.audioVideo.startVideoInput(videoDevices[0].deviceId);
            await session.audioVideo.startLocalVideoTile();

            setTimeout(() => {
              if (!mountedRef.current || !sessionRef.current) return;
              try {
                const localTile = sessionRef.current.audioVideo.getLocalVideoTile();
                if (localTile && localVideoRef.current) {
                  const state = localTile.state();
                  if (state?.active && state.tileId !== null) {
                    sessionRef.current.audioVideo.bindVideoElement(state.tileId, localVideoRef.current);
                  }
                }
              } catch (err) {
                // Ignore binding errors
              }
            }, 500);
          }
        } catch (err) {
          // Continue if video fails
        }

        if (mountedRef.current) {
          setConnecting(false);
          setWaitingForAttendee(true);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          const errorMessage = err?.message || String(err) || 'Failed to start video call';
          console.error('[VIDEO_CALL] Error:', errorMessage);
          setError(errorMessage);
          setConnecting(false);
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      if (sessionRef.current) {
        try {
          const session = sessionRef.current;
          session.audioVideo.stopLocalVideoTile();
          session.audioVideo.stop();
          if (observerRef.current) {
            session.audioVideo.removeObserver(observerRef.current);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [appointmentId, userId]);

  const toggleAudio = () => {
    if (!sessionRef.current) return;
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    try {
      if (newState) {
        sessionRef.current.audioVideo.realtimeUnmuteLocalAudio();
      } else {
        sessionRef.current.audioVideo.realtimeMuteLocalAudio();
      }
    } catch (err) {
      // Ignore toggle errors
    }
  };

  const toggleVideo = async () => {
    if (!sessionRef.current) return;
    const newState = !videoEnabled;
    setVideoEnabled(newState);
    try {
      if (newState) {
        await sessionRef.current.audioVideo.startLocalVideoTile();
        setTimeout(() => {
          if (!sessionRef.current) return;
          try {
            const localTile = sessionRef.current.audioVideo.getLocalVideoTile();
            if (localTile && localVideoRef.current) {
              const state = localTile.state();
              if (state?.tileId !== null) {
                sessionRef.current.audioVideo.bindVideoElement(state.tileId, localVideoRef.current);
              }
            }
          } catch (err) {
            // Ignore binding errors
          }
        }, 300);
      } else {
        sessionRef.current.audioVideo.stopLocalVideoTile();
      }
    } catch (err) {
      // Ignore toggle errors
    }
  };

  const endCall = () => {
    if (sessionRef.current) {
      try {
        sessionRef.current.audioVideo.stopLocalVideoTile();
        sessionRef.current.audioVideo.stop();
        if (observerRef.current) {
          sessionRef.current.audioVideo.removeObserver(observerRef.current);
        }
      } catch (e) {
        // Ignore errors
      }
    }
    onCallEnd?.();
  };

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

  if (Platform.OS !== 'web') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Video calling is only available on web</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <div style={styles.remoteVideoContainer}>
        <video
          ref={(el) => { if (el) remoteVideoRef.current = el; }}
          autoPlay
          playsInline
          style={styles.remoteVideo}
        />
        
        {remoteAttendee && (
          <View style={styles.emailOverlay}>
            <Text style={styles.emailText}>{remoteAttendee}</Text>
          </View>
        )}

        {connecting && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.overlayText}>Connecting to meeting...</Text>
          </View>
        )}

        {!connecting && waitingForAttendee && !remoteAttendee && (
          <View style={styles.waitingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.waitingText}>Waiting for other participant to join...</Text>
            <Text style={styles.waitingSubtext}>You're connected. The call will start when they join.</Text>
          </View>
        )}
      </div>

      {videoEnabled && (
        <div style={styles.localVideoContainer}>
          <video
            ref={(el) => { if (el) localVideoRef.current = el; }}
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

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, !audioEnabled && styles.controlButtonMuted]}
          onPress={toggleAudio}
        >
          <Ionicons name={audioEnabled ? 'mic' : 'mic-off'} size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, !videoEnabled && styles.controlButtonMuted]}
          onPress={toggleVideo}
        >
          <Ionicons name={videoEnabled ? 'videocam' : 'videocam-off'} size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={endCall}>
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
    color: '#ccc',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
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
