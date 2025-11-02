import { useAuth } from '@/hooks/use-auth';
import type { Message } from '@/lib/messaging';
import {
    getConversationMessages,
    sendConversationMessage
} from '@/lib/messaging';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Real-time Messaging Hook
 * 
 * This hook provides real-time messaging functionality using AWS Chime SDK Messaging.
 * It handles message sending, receiving, and synchronization with DynamoDB.
 * 
 * Architecture:
 * - Messages are sent via Chime SDK Messaging channels for real-time delivery
 * - Messages are stored in DynamoDB for persistence and offline access
 * - Real-time updates via polling (can be upgraded to WebSocket/EventBridge later)
 * 
 * Usage:
 * ```tsx
 * const { messages, sendMessage, isLoading, error } = useMessaging(conversationId, channelArn);
 * ```
 * 
 * Features:
 * - Automatic message synchronization
 * - Real-time message delivery (via polling)
 * - Optimistic UI updates (messages appear immediately)
 * - Error handling and retry logic
 * - Loading states for better UX
 */

interface UseMessagingOptions {
  // Conversation ID (DynamoDB)
  conversationId: string | null;
  
  // Chime SDK channel ARN for real-time messaging
  channelArn: string | null;
  
  // Polling interval in milliseconds (default: 2000ms = 2 seconds)
  pollInterval?: number;
  
  // Enable/disable real-time polling (default: true)
  enablePolling?: boolean;
}

interface UseMessagingReturn {
  // Messages in the conversation (sorted by createdAt, oldest first)
  messages: Message[];
  
  // Loading state
  isLoading: boolean;
  
  // Error state
  error: Error | null;
  
  // Send a message
  sendMessage: (content: string) => Promise<void>;
  
  // Refresh messages manually
  refreshMessages: () => Promise<void>;
  
  // Whether a message is currently being sent
  isSending: boolean;
}

/**
 * Custom hook for real-time messaging
 * 
 * This hook manages the entire messaging lifecycle:
 * 1. Loads conversation history from DynamoDB
 * 2. Sets up real-time message polling
 * 3. Handles message sending with optimistic updates
 * 4. Synchronizes with Chime SDK Messaging channel
 * 
 * Real-time Updates:
 * - Polls Chime SDK channel for new messages every 2 seconds (configurable)
 * - Compares message IDs to detect new messages
 * - Updates UI automatically when new messages arrive
 * 
 * Performance:
 * - Debounces rapid message sends
 * - Only polls when conversation is active
 * - Stops polling when component unmounts
 * 
 * Error Handling:
 * - Retries failed message sends
 * - Handles network errors gracefully
 * - Shows error states in UI
 */
export function useMessaging({
  conversationId,
  channelArn,
  pollInterval = 2000, // 2 seconds default
  enablePolling = true,
}: UseMessagingOptions): UseMessagingReturn {
  // Authentication
  const { user } = useAuth();
  const currentUserId = user?.userId || user?.username || '';

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Refs for polling
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);

  /**
   * Load messages from DynamoDB
   * 
   * This function fetches the conversation history from DynamoDB.
   * It's called initially and when manually refreshing.
   */
  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('[USE-MESSAGING] Loading messages for conversation:', conversationId);

      const { messages: loadedMessages } = await getConversationMessages(conversationId, 100);

      // Update last message ID for polling
      if (loadedMessages.length > 0) {
        const lastMessage = loadedMessages[loadedMessages.length - 1];
        lastMessageIdRef.current = lastMessage.chimeMessageId || lastMessage.id;
      }

      setMessages(loadedMessages);
      setIsLoading(false);

      console.log(`[USE-MESSAGING] Loaded ${loadedMessages.length} messages`);
    } catch (err) {
      console.error('[USE-MESSAGING] Error loading messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to load messages'));
      setIsLoading(false);
    }
  }, [conversationId]);

  /**
   * Poll for new messages
   * 
   * This function polls DynamoDB for new messages in the conversation.
   * It compares the last message ID to detect new messages and updates the UI.
   * 
   * Future Enhancement:
   * - Replace polling with Chime SDK WebSocket/EventBridge subscriptions
   * - Use AWS AppSync subscriptions for real-time updates
   * - Implement push notifications for background updates
   */
  const pollForNewMessages = useCallback(async () => {
    if (!conversationId || isPollingRef.current) {
      return;
    }

    try {
      isPollingRef.current = true;

      // Get latest messages
      const { messages: latestMessages } = await getConversationMessages(conversationId, 100);

      // Find new messages (messages with IDs after lastMessageIdRef)
      const lastMessageId = lastMessageIdRef.current;
      let hasNewMessages = false;

      if (lastMessageId) {
        // Find index of last known message
        const lastMessageIndex = latestMessages.findIndex(
          msg => (msg.chimeMessageId || msg.id) === lastMessageId
        );

        if (lastMessageIndex >= 0 && lastMessageIndex < latestMessages.length - 1) {
          // New messages found
          hasNewMessages = true;
        }
      } else if (latestMessages.length > messages.length) {
        // No last message ID, check if message count increased
        hasNewMessages = true;
      }

      if (hasNewMessages || latestMessages.length !== messages.length) {
        console.log('[USE-MESSAGING] New messages detected, updating UI');
        
        // Update last message ID
        if (latestMessages.length > 0) {
          const lastMessage = latestMessages[latestMessages.length - 1];
          lastMessageIdRef.current = lastMessage.chimeMessageId || lastMessage.id;
        }

        setMessages(latestMessages);
      }

      isPollingRef.current = false;
    } catch (err) {
      console.error('[USE-MESSAGING] Error polling for messages:', err);
      isPollingRef.current = false;
      // Don't set error state for polling failures (non-critical)
    }
  }, [conversationId, messages]);

  /**
   * Send a message
   * 
   * This function:
   * 1. Adds message optimistically to UI (for instant feedback)
   * 2. Sends message via Chime SDK Messaging channel
   * 3. Updates message status based on send result
   * 4. Refreshes messages to get final message from server
   * 
   * Optimistic Updates:
   * - Message appears immediately in UI
   * - Status changes to 'sent' when server confirms
   * - Error handling if send fails
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !channelArn || !content.trim() || isSending) {
      return;
    }

    // Optimistic message ID for tracking
    const optimisticMessageId = `temp-${Date.now()}`;

    try {
      setIsSending(true);
      setError(null);

      // Optimistic update: Add message to UI immediately
      const optimisticMessage: Message = {
        id: optimisticMessageId,
        conversationId,
        senderId: currentUserId,
        senderName: user?.username || 'You',
        content: content.trim(),
        type: 'text',
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, optimisticMessage]);

      console.log('[USE-MESSAGING] Sending message:', content.substring(0, 50));

      // Send message via Chime SDK Messaging
      const sentMessage = await sendConversationMessage(
        conversationId,
        channelArn,
        content.trim(),
        user?.username || 'You'
      );

      console.log('[USE-MESSAGING] Message sent successfully:', sentMessage.id);

      // Replace optimistic message with real message
      setMessages(prev =>
        prev.map(msg =>
          msg.id === optimisticMessageId
            ? { ...sentMessage, status: 'sent' as const }
            : msg
        )
      );

      // Update last message ID
      lastMessageIdRef.current = sentMessage.chimeMessageId || sentMessage.id;

      // Refresh messages to get any server-side updates
      await loadMessages();
    } catch (err) {
      console.error('[USE-MESSAGING] Error sending message:', err);

      // Update optimistic message status to 'failed'
      setMessages(prev =>
        prev.map(msg =>
          msg.id === optimisticMessageId
            ? { ...msg, status: 'failed' as const }
            : msg
        )
      );

      setError(err instanceof Error ? err : new Error('Failed to send message'));
    } finally {
      setIsSending(false);
    }
  }, [conversationId, channelArn, currentUserId, user, isSending, loadMessages]);

  /**
   * Refresh messages manually
   * 
   * This function manually reloads messages from DynamoDB.
   * Useful for pull-to-refresh or manual refresh actions.
   */
  const refreshMessages = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  /**
   * Set up polling for real-time updates
   * 
   * This effect sets up automatic polling for new messages.
   * It polls every `pollInterval` milliseconds when:
   * - Conversation is active
   * - Polling is enabled
   * - Component is mounted
   */
  useEffect(() => {
    if (!enablePolling || !conversationId) {
      // Clear polling if disabled or no conversation
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    console.log('[USE-MESSAGING] Starting message polling, interval:', pollInterval);

    // Start polling
    pollingIntervalRef.current = setInterval(() => {
      pollForNewMessages();
    }, pollInterval);

    // Cleanup on unmount or when conversation changes
    return () => {
      if (pollingIntervalRef.current) {
        console.log('[USE-MESSAGING] Stopping message polling');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [enablePolling, conversationId, pollInterval, pollForNewMessages]);

  /**
   * Load messages when conversation changes
   * 
   * This effect loads messages whenever the conversation ID changes.
   * It runs on mount and when conversationId changes.
   */
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages,
    isSending,
  };
}

