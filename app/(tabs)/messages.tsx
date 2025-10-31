import { useAuth } from '@/hooks/use-auth';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type ChatMessage = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: number;
};

export default function MessagesScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>({
    c1: [
      { id: 'm1', sender: 'them', text: 'Hi, how are you feeling today?', timestamp: Date.now() - 3600_000 },
      { id: 'm2', sender: 'me', text: 'Doing better, thanks!', timestamp: Date.now() - 3400_000 },
    ],
    c2: [
      { id: 'm3', sender: 'them', text: 'Your lab results are in. Want to review?', timestamp: Date.now() - 7200_000 },
    ],
  });
  const [draftText, setDraftText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Redirect unauthenticated users away from this screen
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/(tabs)/account');
    }
  }, [authLoading, isAuthenticated]);

  const activeMessages = useMemo(() => {
    if (!conversationId) return [] as ChatMessage[];
    return messagesByConversation[conversationId] ?? [];
  }, [conversationId, messagesByConversation]);

  const handleSend = () => {
    const trimmed = draftText.trim();
    if (!conversationId || !trimmed) return;
    const newMessage: ChatMessage = {
      id: `m_${Date.now()}`,
      sender: 'me',
      text: trimmed,
      timestamp: Date.now(),
    };
    setMessagesByConversation(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] ?? []), newMessage],
    }));
    setDraftText('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      {!conversationId ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Select a conversation</Text>
          <Text style={styles.emptySubtitle}>Choose one from the left or start a new one.</Text>
        </View>
      ) : (
        <View style={styles.chatWrapper}>
          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {activeMessages.map(msg => (
              <View key={msg.id} style={[styles.messageBubble, msg.sender === 'me' ? styles.messageMine : styles.messageTheirs]}>
                <Text style={styles.messageText}>{msg.text}</Text>
                <Text style={styles.messageMeta}>{new Date(msg.timestamp).toLocaleTimeString()}</Text>
              </View>
            ))}
            {activeMessages.length === 0 && (
              <View style={styles.noMessages}>
                <Text style={styles.noMessagesText}>No messages yet. Say hello!</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.composerRow}>
            <TextInput
              style={styles.input}
              placeholder="Type a message"
              placeholderTextColor="#9CA3AF"
              value={draftText}
              onChangeText={setDraftText}
              multiline
            />
            <TouchableOpacity onPress={handleSend} style={styles.sendButton} accessibilityRole="button" accessibilityLabel="Send message">
              <Text style={styles.sendLabel}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  messageText: {
    fontSize: 14,
    color: '#111827',
  },
  messageMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
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
  },
  sendLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

