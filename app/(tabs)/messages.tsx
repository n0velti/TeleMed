import type { Schema } from '@/amplify/data/resource';
import { useAuth } from '@/hooks/use-auth';
import { useMessaging } from '@/hooks/use-messaging';
import { generateClient } from 'aws-amplify/data';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/**
 * Messages Screen Component
 * 
 * This screen displays real-time messaging between users using AWS Chime SDK Messaging.
 * It provides a chat interface with:
 * - Real-time message delivery via Chime SDK Messaging channels
 * - Message persistence in DynamoDB
 * - Optimistic UI updates for instant feedback
 * - Automatic message synchronization
 * 
 * Architecture:
 * - Uses useMessaging hook for real-time messaging
 * - Fetches conversation details from DynamoDB
 * - Sends/receives messages via Chime SDK Messaging channels
 * - Stores messages in DynamoDB for offline access
 * 
 * Security:
 * - Only authenticated users can access conversations
 * - Conversation access is validated via authorization
 * - Messages are encrypted in transit
 * 
 * Performance:
 * - Messages are loaded lazily (paginated)
 * - Real-time polling only when conversation is active
 * - Optimistic updates for instant UI feedback
 */

// Initialize Amplify Data client for DynamoDB operations
const client = generateClient<Schema>();

export default function MessagesScreen() {
  // Authentication
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  
  // State
  const [conversation, setConversation] = useState<{ id: string; channelArn: string; name: string } | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState<Error | null>(null);
  const [draftText, setDraftText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  /**
   * Real-time messaging hook
   * 
   * This hook provides:
   * - Messages array (sorted by timestamp)
   * - Send message function
   * - Loading and error states
   * - Automatic message polling for real-time updates
   */
  const {
    messages,
    isLoading: isLoadingMessages,
    error: messagingError,
    sendMessage,
    isSending,
  } = useMessaging({
    conversationId: conversationId || null,
    channelArn: conversation?.channelArn || null,
    pollInterval: 2000, // Poll every 2 seconds for new messages
    enablePolling: !!conversationId && !!conversation?.channelArn, // Only poll when conversation is active
  });

  /**
   * Load conversation details from DynamoDB
   * 
   * This effect loads the conversation metadata when conversationId changes.
   * It fetches the channelArn needed for Chime SDK Messaging.
   */
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId) {
        setConversation(null);
        return;
      }

      try {
        setIsLoadingConversation(true);
        setConversationError(null);

        console.log('[MESSAGES] Loading conversation:', conversationId);

        // Fetch conversation from DynamoDB
        const { data: conv, errors } = await client.models.Conversation.get({
          id: conversationId,
        });

        if (errors || !conv) {
          throw new Error('Conversation not found');
        }

        if (!conv.channelArn) {
          throw new Error('Conversation missing channel ARN');
        }

        setConversation({
          id: conv.id,
          channelArn: conv.channelArn,
          name: conv.name,
        });

        console.log('[MESSAGES] Conversation loaded:', conv.name);
      } catch (err) {
        console.error('[MESSAGES] Error loading conversation:', err);
        setConversationError(err instanceof Error ? err : new Error('Failed to load conversation'));
        setConversation(null);
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  /**
   * Redirect unauthenticated users
   * 
   * This effect ensures only authenticated users can access the messages screen.
   */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(tabs)/account');
    }
  }, [authLoading, isAuthenticated]);

  /**
   * Scroll to bottom when new messages arrive
   * 
   * This effect automatically scrolls to the bottom of the message list
   * when new messages are received or sent.
   */
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure UI has updated
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  /**
   * Handle sending a message
   * 
   * This function:
   * 1. Validates the message content
   * 2. Calls sendMessage from useMessaging hook
   * 3. Clears the input field
   * 4. Scrolls to bottom to show new message
   */
  const handleSend = async () => {
    const trimmed = draftText.trim();
    if (!conversationId || !trimmed || isSending || !conversation) return;

    try {
      await sendMessage(trimmed);
      setDraftText('');
      // Scroll will happen automatically via useEffect
    } catch (error) {
      console.error('[MESSAGES] Error sending message:', error);
      // Error is handled by useMessaging hook
    }
  };

  /**
   * Determine if a message was sent by the current user
   * 
   * This function compares the message sender ID with the current user ID
   * to determine message alignment in the UI.
   */
  const isMyMessage = (senderId: string): boolean => {
    const currentUserId = user?.userId || user?.username || '';
    return senderId === currentUserId;
  };

  // Combine loading states
  const isLoading = isLoadingConversation || (isLoadingMessages && messages.length === 0);
  const error = conversationError || messagingError;

  /**
   * Render empty state when no conversation is selected
   */
  if (!conversationId) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Select a conversation</Text>
          <Text style={styles.emptySubtitle}>Choose one from the left or start a new one.</Text>
        </View>
      </View>
    );
  }

  /**
   * Render loading state while conversation or messages are loading
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </View>
    );
  }

  /**
   * Render error state if conversation or messaging fails
   */
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error.message}</Text>
          <TouchableOpacity 
            onPress={() => {
              setConversationError(null);
              // Reload conversation
              if (conversationId) {
                router.replace(`/(tabs)/messages?conversationId=${conversationId}`);
              }
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /**
   * Render main chat interface
   * 
   * This displays:
   * - Conversation header with name
   * - Message list with real-time updates
   * - Message input and send button
   */
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      {/* Conversation Header */}
      {conversation && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{conversation.name}</Text>
          {isSending && (
            <View style={styles.sendingIndicator}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.sendingText}>Sending...</Text>
            </View>
          )}
        </View>
      )}

      {/* Messages List */}
      <ScrollView 
        ref={scrollRef} 
        style={styles.messages} 
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => {
          const isMine = isMyMessage(msg.senderId);
          return (
            <View 
              key={msg.id} 
              style={[
                styles.messageBubble, 
                isMine ? styles.messageMine : styles.messageTheirs
              ]}
            >
              {!isMine && (
                <Text style={styles.senderName}>{msg.senderName}</Text>
              )}
              <Text style={styles.messageText}>{msg.content}</Text>
              <View style={styles.messageFooter}>
                <Text style={styles.messageMeta}>
                  {msg.createdAt 
                    ? new Date(msg.createdAt).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : ''
                  }
                </Text>
                {isMine && (
                  <Text style={styles.messageStatus}>
                    {msg.status === 'sending' && 'Sending...'}
                    {msg.status === 'sent' && '✓'}
                    {msg.status === 'failed' && '✗'}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
        {messages.length === 0 && !isLoadingMessages && (
          <View style={styles.noMessages}>
            <Text style={styles.noMessagesText}>No messages yet. Say hello!</Text>
          </View>
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.composerRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor="#9CA3AF"
          value={draftText}
          onChangeText={setDraftText}
          multiline
          editable={!isSending}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity 
          onPress={handleSend} 
          style={[styles.sendButton, (isSending || !draftText.trim()) && styles.sendButtonDisabled]} 
          accessibilityRole="button" 
          accessibilityLabel="Send message"
          disabled={isSending || !draftText.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendLabel}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sendingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  chatWrapper: {
    flex: 1,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCFCE7',
  },
  messageTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  messageStatus: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },
  noMessages: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noMessagesText: {
    fontSize: 13,
    color: '#6B7280',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  sendLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

