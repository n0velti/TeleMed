/**
 * Video Call Component - AWS Chime SDK
 * 
 * Clean, simplified implementation for Amplify Gen 2
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
  
  const sessionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const attendeeIdRef = useRef<string | null>(null);
  const observerRef = useRef<any>(null);
  
  const { userId } = useAuth();

  // Verify authorization
  const checkAuth = async (): Promise<boolean> => {
    if (!appointmentId || !userId) return false;
    
    try {
      const appointment = await dataClient.models.Appointment.get({ id: appointmentId });
      const apt = appointment.data;
      return apt ? (apt.userId === userId || apt.specialistId === userId) : false;
    } catch {
      return false;
    }
  };

  // Initialize meeting
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setError('Video calling is only available on web');
      setConnecting(false);
      return;
    }

    if (!appointmentId || !userId) {
      setError('Missing appointment ID or user not authenticated');
      setConnecting(false);
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        // Check authorization
        const authorized = await checkAuth();
        if (!authorized) {
          setError('Not authorized to access this appointment');
          setConnecting(false);
          return;
        }

        // Get credentials
        const credentials = await createMeetingSession(appointmentId);
        if (!mounted) return;

        // Load Chime SDK
        const chimeModule = await import('@/lib/chime-sdk-web');
        const chimeSDK = await chimeModule.loadChimeSDK();
        const {
          DefaultMeetingSession,
          DefaultDeviceController,
          MeetingSessionConfiguration,
          LogLevel,
          ConsoleLogger,
        } = chimeSDK;

        // Create session configuration
        const config = new MeetingSessionConfiguration({
          Meeting: {
            MeetingId: credentials.meetingInfo.meetingId,
            MediaRegion: credentials.meetingInfo.mediaRegion,
            MediaPlacement: credentials.meetingInfo.mediaPlacement,
          },
          Attendee: {
            AttendeeId: credentials.attendeeInfo.attendeeId,
            ExternalUserId: credentials.attendeeInfo.externalUserId,
            JoinToken: credentials.attendeeInfo.joinToken,
          },
        });

        // Create session
        const logger = new ConsoleLogger('VideoCall', LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);
        const session = new DefaultMeetingSession(config, logger, deviceController);
        
        sessionRef.current = session;
        attendeeIdRef.current = credentials.attendeeInfo.attendeeId;

        // Set up observer
        const observer: any = {
          videoTileDidUpdate: (tileState: any) => {
            const isLocal = tileState.localTile === true || 
                          tileState.boundAttendeeId === attendeeIdRef.current;
            
            if (isLocal && localVideoRef.current && tileState.tileId !== null) {
              session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
            } else if (!isLocal && remoteVideoRef.current && tileState.tileId !== null) {
              const audioVideoAny = session.audioVideo as any;
              if (audioVideoAny.startRemoteVideo) {
                audioVideoAny.startRemoteVideo(tileState.boundAttendeeId)
                  .then(() => {
                    if (tileState.tileId !== null && remoteVideoRef.current) {
                      session.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                    }
                  })
                  .catch(() => {
                    // Try binding anyway
                    if (tileState.tileId !== null && remoteVideoRef.current) {
                      session.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                    }
                  });
              } else {
                session.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
              }
              
              if (tileState.boundExternalUserId) {
                setRemoteAttendee(tileState.boundExternalUserId);
              }
            }
          },
          
          videoTileWasRemoved: () => {
            setRemoteAttendee(null);
          },
          
          attendeeDidPresenceChange: (presence: any, attendeeId: string) => {
            if (presence.present && attendeeId !== attendeeIdRef.current) {
              const audioVideoAny = session.audioVideo as any;
              const realtimeController = audioVideoAny.realtimeController;
              if (realtimeController) {
                const externalUserId = realtimeController.getAttendeeExternalUserId?.(attendeeId);
                if (externalUserId) {
                  setRemoteAttendee(externalUserId);
                }
              }
            } else if (!presence.present) {
              setRemoteAttendee(null);
            }
          },
        };

        session.audioVideo.addObserver(observer);
        observerRef.current = observer;

        // Start session
        await session.audioVideo.start();
        if (!mounted) return;

        // Enable audio
        try {
          const audioDevices = await session.audioVideo.listAudioInputDevices();
          if (audioDevices.length > 0) {
            await session.audioVideo.chooseAudioInputDevice(audioDevices[0].deviceId);
          }
          session.audioVideo.realtimeUnmuteLocalAudio();
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
              const localTile = session.audioVideo.getLocalVideoTile();
              if (localTile && localVideoRef.current) {
                const state = localTile.state();
                if (state?.active && state.tileId !== null) {
                  session.audioVideo.bindVideoElement(state.tileId, localVideoRef.current);
                }
              }
            }, 500);
          }
        } catch (err) {
          // Continue if video fails
        }

        setConnecting(false);
      } catch (err: any) {
        if (!mounted) return;
        setError(err.message || 'Failed to start video call');
        setConnecting(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (sessionRef.current) {
        const session = sessionRef.current;
        try {
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
          const localTile = sessionRef.current.audioVideo.getLocalVideoTile();
          if (localTile && localVideoRef.current) {
            const state = localTile.state();
            if (state?.tileId !== null) {
              sessionRef.current.audioVideo.bindVideoElement(state.tileId, localVideoRef.current);
            }
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
            <Text style={styles.overlayText}>Connecting...</Text>
          </View>
        )}

        {!connecting && !remoteAttendee && (
          <View style={styles.waitingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.waitingText}>Waiting for other participant...</Text>
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
