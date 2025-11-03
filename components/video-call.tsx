import { createMeetingSession } from '@/lib/chime';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform } from 'expo-modules-core';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface VideoCallProps {
  appointmentId?: string;
  onCallEnd?: () => void;
}

interface RemoteAttendee {
  attendeeId: string;
  email: string;
}

export function VideoCall({ appointmentId, onCallEnd }: VideoCallProps) {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteAttendee, setRemoteAttendee] = useState<RemoteAttendee | null>(null);
  const [attendeeEmails, setAttendeeEmails] = useState<Map<string, string>>(new Map());
  const [attendeeCount, setAttendeeCount] = useState(1); // Start with 1 (yourself)
  const [expectedAttendees, setExpectedAttendees] = useState(2); // For appointments, usually 2 people

  const meetingSessionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentAttendeeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setError('Video calling is only available on web');
              return;
    }

    const initialize = async () => {
      try {
        // Get credentials
        const credentials = await createMeetingSession(appointmentId);
        
        // Validate credentials structure BEFORE using them
        if (!credentials) {
          throw new Error('Invalid credentials: credentials object is null or undefined');
        }
        if (!credentials.meetingInfo?.mediaPlacement) {
          throw new Error('Invalid credentials: mediaPlacement is missing');
        }
        if (!credentials.attendeeInfo?.attendeeId) {
          throw new Error('Invalid credentials: attendeeId is missing');
        }
        if (!credentials.attendeeInfo?.joinToken) {
          throw new Error('Invalid credentials: joinToken is missing');
        }
        if (!credentials.meetingInfo?.meetingId) {
          throw new Error('Invalid credentials: meetingId is missing');
        }
        
        currentAttendeeIdRef.current = credentials.attendeeInfo.attendeeId;
        
        console.log('[VIDEO_CALL] Credentials validated:', {
          meetingId: credentials.meetingInfo.meetingId,
          attendeeId: credentials.attendeeInfo.attendeeId,
          hasMediaPlacement: !!credentials.meetingInfo.mediaPlacement,
          hasAudioHostUrl: !!credentials.meetingInfo.mediaPlacement?.audioHostUrl,
        });

        // Load Chime SDK
        const chimeSDK = await import('@/lib/chime-sdk-web').then(m => m.loadChimeSDK());
        const {
          DefaultMeetingSession,
          DefaultDeviceController,
          MeetingSessionConfiguration,
          LogLevel,
          ConsoleLogger,
        } = chimeSDK;

        // Create configuration object in the format Chime SDK expects
        // SDK can handle camelCase properties, MeetingSessionConfiguration will handle conversion
        const mediaPlacement = credentials.meetingInfo.mediaPlacement;
        
        // Validate required fields first
        if (!mediaPlacement.audioHostUrl) {
          throw new Error('Invalid credentials: audioHostUrl is missing in mediaPlacement');
        }
        if (!mediaPlacement.signalingUrl) {
          throw new Error('Invalid credentials: signalingUrl is missing in mediaPlacement');
        }
        if (!mediaPlacement.turnControlUrl) {
          throw new Error('Invalid credentials: turnControlUrl is missing in mediaPlacement');
        }

        // Build configuration object - MeetingSessionConfiguration expects PascalCase
        // But SDK may also need camelCase for internal access
        const configObject: any = {
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
            ExternalUserId: credentials.attendeeInfo.externalUserId || credentials.attendeeInfo.attendeeId || '',
            JoinToken: credentials.attendeeInfo.joinToken,
          },
          // Also include camelCase versions for SDK internal access
          meeting: {
            meetingId: credentials.meetingInfo.meetingId,
            mediaRegion: credentials.meetingInfo.mediaRegion || 'us-east-1',
            mediaPlacement: {
              audioHostUrl: mediaPlacement.audioHostUrl,
              audioFallbackUrl: mediaPlacement.audioFallbackUrl || '',
              signalingUrl: mediaPlacement.signalingUrl,
              turnControlUrl: mediaPlacement.turnControlUrl,
              screenDataUrl: mediaPlacement.screenDataUrl || '',
              screenViewingUrl: mediaPlacement.screenViewingUrl || '',
              screenSharingUrl: mediaPlacement.screenSharingUrl || '',
              eventIngestionUrl: mediaPlacement.eventIngestionUrl || '',
            },
          },
          attendee: {
            attendeeId: credentials.attendeeInfo.attendeeId,
            externalUserId: credentials.attendeeInfo.externalUserId || credentials.attendeeInfo.attendeeId || '',
            joinToken: credentials.attendeeInfo.joinToken,
          },
          // Some SDK versions may access credentials directly
          credentials: {
            attendeeId: credentials.attendeeInfo.attendeeId,
            externalUserId: credentials.attendeeInfo.externalUserId || credentials.attendeeInfo.attendeeId || '',
            joinToken: credentials.attendeeInfo.joinToken,
            meetingId: credentials.meetingInfo.meetingId,
            mediaRegion: credentials.meetingInfo.mediaRegion || 'us-east-1',
          },
        };

        // Double-check that attendeeId is not null/undefined before creating session
        if (!configObject.Attendee.AttendeeId) {
          throw new Error('Cannot create session: AttendeeId is null or undefined in config object');
        }

        console.log('[VIDEO_CALL] Creating MeetingSessionConfiguration with:', {
          MeetingId: configObject.Meeting.MeetingId,
          AttendeeId: configObject.Attendee.AttendeeId,
          ExternalUserId: configObject.Attendee.ExternalUserId,
          hasJoinToken: !!configObject.Attendee.JoinToken,
          JoinTokenLength: configObject.Attendee.JoinToken?.length || 0,
        });

        // Create meeting session with error handling
        const logger = new ConsoleLogger('VideoCall', LogLevel.WARN);
        let configuration: any;
        let session: any;
        
        try {
          const deviceController = new DefaultDeviceController(logger);
          
          // Create configuration - ensure credentials are accessible
          configuration = new MeetingSessionConfiguration(configObject);
          
          // Verify configuration was created successfully
          if (!configuration) {
            throw new Error('MeetingSessionConfiguration creation returned null/undefined');
          }
          
          // Ensure credentials are accessible - DefaultEventController needs configuration.credentials.attendeeId
          const configAny = configuration as any;
          
          // Manually ensure credentials property exists with attendeeId
          // This is needed because DefaultEventController.setupEventReporter accesses configuration.credentials.attendeeId
          if (!configAny.credentials) {
            configAny.credentials = {
              attendeeId: credentials.attendeeInfo.attendeeId,
              externalUserId: credentials.attendeeInfo.externalUserId || credentials.attendeeInfo.attendeeId || '',
              joinToken: credentials.attendeeInfo.joinToken,
              meetingId: credentials.meetingInfo.meetingId,
              mediaRegion: credentials.meetingInfo.mediaRegion || 'us-east-1',
            };
            console.log('[VIDEO_CALL] Manually set credentials on configuration object');
          }
          
          // Verify attendeeId is accessible
          if (!configAny.credentials?.attendeeId && !configAny.credentials?.AttendeeId) {
            throw new Error('AttendeeId not accessible from configuration.credentials - cannot create session');
          }
          
          console.log('[VIDEO_CALL] Configuration created successfully:', {
            attendeeId: configAny.credentials.attendeeId || configAny.credentials.AttendeeId,
            hasCredentials: !!configAny.credentials,
          });
          
          session = new DefaultMeetingSession(
            configuration,
            logger,
            deviceController
          );
        } catch (configError: any) {
          console.error('[VIDEO_CALL] Error creating session configuration:', configError);
          console.error('[VIDEO_CALL] Config object that failed:', JSON.stringify(configObject, null, 2));
          throw new Error(`Failed to create meeting session: ${configError.message}`);
        }

        meetingSessionRef.current = session;

        // Start session
        await session.audioVideo.start();
        setIsConnecting(false);

        // Enable video automatically
        const devices = await session.audioVideo.listVideoInputDevices();
        if (devices.length > 0) {
          await session.audioVideo.startVideoInput(devices[0].deviceId);
          // Start local video tile to show your video
          await session.audioVideo.startLocalVideoTile();
          console.log('[VIDEO_CALL] Local video started automatically');
        }

        // Set up observers
    const observer = {
      videoTileDidUpdate: (tileState: any) => {
            const attendeeId = tileState.boundAttendeeId;
            const isLocal = tileState.localTile === true;

            if (isLocal && localVideoRef.current) {
              session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
            } else if (!isLocal && attendeeId && remoteVideoRef.current) {
              // Subscribe to remote video (required in v3+)
              const audioVideoAny = session.audioVideo as any;
              if (audioVideoAny.startRemoteVideo) {
                audioVideoAny.startRemoteVideo(attendeeId).catch(() => {
                  // Already subscribed or method not available
                });
              }
              
              // Bind video element
              session.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
              
              // Get email from externalUserId or stored map
              const externalUserId = tileState.boundExternalUserId;
              const email = externalUserId || attendeeEmails.get(attendeeId) || attendeeId;
              setRemoteAttendee({ attendeeId, email });
            }
          },

      attendeeDidPresenceChange: (presence: any, attendeeId: string) => {
            console.log('[VIDEO_CALL] Attendee presence changed:', { 
              attendeeId, 
              present: presence.present,
              isSelf: attendeeId === currentAttendeeIdRef.current 
            });
            
            // Update attendee count using realtime controller
            const audioVideoAny = session.audioVideo as any;
            const realtimeController = audioVideoAny.realtimeController;
            if (realtimeController) {
              try {
                // Get all attendees from presence status
                const attendees = realtimeController.attendeePresenceStatus || {};
                const presentAttendees = Object.keys(attendees).filter(id => 
                  attendees[id]?.present === true
                );
                const remoteCount = presentAttendees.filter(id => 
                  id !== currentAttendeeIdRef.current
                ).length;
                const totalCount = remoteCount + 1; // +1 for yourself
                setAttendeeCount(totalCount);
                
                console.log('[VIDEO_CALL] Presence update - Total:', totalCount, 'Remote:', remoteCount);
                
                // Also try to get from video sources
                try {
                  const videoSources = realtimeController.getAllRemoteVideoSources?.() || [];
                  if (videoSources.length > 0) {
                    const remoteFromSources = videoSources.filter((a: any) => 
                      a.attendeeId && a.attendeeId !== currentAttendeeIdRef.current
                    ).length;
                    if (remoteFromSources > remoteCount) {
                      setAttendeeCount(remoteFromSources + 1);
                    }
                  }
                } catch (e) {
                  // getAllRemoteVideoSources not available, continue
                }
              } catch (e) {
                console.error('[VIDEO_CALL] Error in attendeeDidPresenceChange:', e);
                // Fallback: count based on presence
                if (presence.present && attendeeId !== currentAttendeeIdRef.current) {
                  setAttendeeCount(prev => Math.max(prev, 2)); // At least 2 if someone else is present
                } else if (!presence.present) {
                  setAttendeeCount(prev => Math.max(1, prev - 1)); // Decrement if someone left
                }
              }
            }
            
            if (presence.present && attendeeId !== currentAttendeeIdRef.current) {
              // Get externalUserId from realtime controller
              try {
                const audioVideoAny = session.audioVideo as any;
                const realtimeController = audioVideoAny.realtimeController;
                if (realtimeController) {
                  const externalUserId = realtimeController.getAttendeeExternalUserId?.(attendeeId);
                  if (externalUserId) {
                    setAttendeeEmails(prev => new Map(prev).set(attendeeId, externalUserId));
                    setRemoteAttendee({ attendeeId, email: externalUserId });
                    console.log('[VIDEO_CALL] Remote attendee detected:', { attendeeId, email: externalUserId });
                  }
                }
              } catch (e) {
                console.log('[VIDEO_CALL] Could not get externalUserId:', e);
              }
            } else if (!presence.present && remoteAttendee?.attendeeId === attendeeId) {
              // Remote attendee left
              setRemoteAttendee(null);
              console.log('[VIDEO_CALL] Remote attendee left:', attendeeId);
            }
          },

          remoteVideoSourcesDidChange: (videoSources: any[]) => {
            // Update attendee count
            if (videoSources) {
              const remoteCount = videoSources.filter((source: any) => 
                source.attendeeId && source.attendeeId !== currentAttendeeIdRef.current
              ).length;
              setAttendeeCount(remoteCount + 1); // +1 for yourself
            }
            
            if (videoSources && videoSources.length > 0) {
              for (const source of videoSources) {
                if (source.attendeeId && source.attendeeId !== currentAttendeeIdRef.current) {
                  const externalUserId = source.externalUserId;
                  if (externalUserId) {
                    setAttendeeEmails(prev => new Map(prev).set(source.attendeeId, externalUserId));
                    if (!remoteAttendee || remoteAttendee.attendeeId === source.attendeeId) {
                      setRemoteAttendee({ attendeeId: source.attendeeId, email: externalUserId });
                    }
                  }
                }
              }
            }
          },
        };

        session.audioVideo.addObserver(observer);

        // Initial video tile binding - try multiple times to ensure it binds
        const bindLocalVideo = () => {
          const localTile = session.audioVideo.getLocalVideoTile();
          if (localTile && localVideoRef.current) {
            const tileState = localTile.state();
            if (tileState && tileState.active && tileState.tileId !== null) {
              session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
              console.log('[VIDEO_CALL] Local video bound to element');
            } else {
              console.log('[VIDEO_CALL] Local tile not active yet, will retry');
            }
          }
        };
        
        // Try immediately, then retry after delays
        bindLocalVideo();
        setTimeout(bindLocalVideo, 500);
        setTimeout(bindLocalVideo, 1000);
        setTimeout(bindLocalVideo, 2000);

      } catch (err: any) {
        console.error('Failed to initialize meeting:', err);
        setError(err.message || 'Failed to start video call');
        setIsConnecting(false);
      }
    };

    let countInterval: ReturnType<typeof setInterval> | null = null;
    
    initialize().then(() => {
      // Set up periodic attendee count update after initialization
      const updateAttendeeCount = () => {
        if (!meetingSessionRef.current) return;
        try {
          const session = meetingSessionRef.current;
          const audioVideoAny = session.audioVideo as any;
          const realtimeController = audioVideoAny.realtimeController;
          
          if (realtimeController) {
            // Method 1: Use attendeePresenceStatus
            const attendees = realtimeController.attendeePresenceStatus || {};
            const allAttendeeIds = Object.keys(attendees);
            const presentAttendees = allAttendeeIds.filter(id => 
              attendees[id]?.present === true
            );
            
            // Method 2: Use getAllVideoTiles to double-check
            const allTiles = session.audioVideo.getAllVideoTiles();
            const remoteTileAttendeeIds = new Set<string>();
            allTiles.forEach((tile: any) => {
              if (tile.state() && !tile.state().localTile && tile.state().boundAttendeeId) {
                remoteTileAttendeeIds.add(tile.state().boundAttendeeId);
              }
            });
            
            // Method 3: Use getAllRemoteVideoSources
            let remoteVideoSources: any[] = [];
            try {
              remoteVideoSources = realtimeController.getAllRemoteVideoSources?.() || [];
            } catch (e) {
              // Method not available
            }
            
            // Count remote attendees (excluding self)
            const remoteAttendeeIds = new Set<string>();
            
            // Add from presence status
            presentAttendees.forEach(id => {
              if (id !== currentAttendeeIdRef.current) {
                remoteAttendeeIds.add(id);
              }
            });
            
            // Add from video tiles
            remoteTileAttendeeIds.forEach(id => {
              if (id !== currentAttendeeIdRef.current) {
                remoteAttendeeIds.add(id);
              }
            });
            
            // Add from video sources
            remoteVideoSources.forEach((source: any) => {
              if (source.attendeeId && source.attendeeId !== currentAttendeeIdRef.current) {
                remoteAttendeeIds.add(source.attendeeId);
              }
            });
            
            const totalCount = remoteAttendeeIds.size + 1; // +1 for yourself
            setAttendeeCount(totalCount);
            
            console.log('[VIDEO_CALL] Attendee count update:', {
              total: totalCount,
              remote: remoteAttendeeIds.size,
              yourself: 1,
              remoteAttendeeIds: Array.from(remoteAttendeeIds),
              presentAttendees,
              remoteVideoSources: remoteVideoSources.length,
            });
            
            // Update remote attendee if we have one
            if (remoteAttendeeIds.size > 0) {
              const firstRemoteId = Array.from(remoteAttendeeIds)[0];
              const externalUserId = realtimeController.getAttendeeExternalUserId?.(firstRemoteId);
              if (externalUserId) {
                setRemoteAttendee({ attendeeId: firstRemoteId, email: externalUserId });
              } else {
                // Set with attendeeId as fallback
                setRemoteAttendee(prev => {
                  // Only update if we don't have one or if the attendee changed
                  if (!prev || prev.attendeeId !== firstRemoteId) {
                    return { attendeeId: firstRemoteId, email: firstRemoteId };
                  }
                  return prev;
                });
              }
            } else {
              // No remote attendees
              setRemoteAttendee(null);
            }
          }
        } catch (e) {
          console.error('[VIDEO_CALL] Error updating attendee count:', e);
        }
      };

      // Update count periodically
      countInterval = setInterval(updateAttendeeCount, 2000);
    });

    // Cleanup function
    return () => {
      if (countInterval) {
        clearInterval(countInterval);
      }
      if (meetingSessionRef.current) {
        const session = meetingSessionRef.current;
        session.audioVideo.stopLocalVideoTile();
        session.audioVideo.stop();
        session.audioVideo.leave();
      }
    };
  }, [appointmentId]);

  const toggleAudio = () => {
    if (!meetingSessionRef.current) return;
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    if (newState) {
      meetingSessionRef.current.audioVideo.realtimeUnmuteLocalAudio();
    } else {
      meetingSessionRef.current.audioVideo.realtimeMuteLocalAudio();
    }
  };

  const toggleVideo = async () => {
    if (!meetingSessionRef.current) return;
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    const session = meetingSessionRef.current;
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
    } else {
      session.audioVideo.stopLocalVideoTile();
    }
  };

  const endCall = () => {
    if (meetingSessionRef.current) {
      const session = meetingSessionRef.current;
      session.audioVideo.stopLocalVideoTile();
      session.audioVideo.stop();
      session.audioVideo.leave();
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
        {isConnecting && (
          <View style={styles.overlay}>
                  <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.overlayText}>Connecting...</Text>
              </View>
            )}

        {/* Waiting for Participants Overlay */}
        {!isConnecting && !remoteAttendee && attendeeCount < expectedAttendees && (
              <View style={styles.waitingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.waitingText}>Waiting for {expectedAttendees - attendeeCount} other participant{expectedAttendees - attendeeCount !== 1 ? 's' : ''}...</Text>
            <Text style={styles.waitingSubtext}>Currently {attendeeCount} of {expectedAttendees} in the room</Text>
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
