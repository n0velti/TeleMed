import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { handleSignOut } from '@/lib/auth';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Helper function to capitalize the first letter of a string
const capitalizeFirst = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export function CustomLeftTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const resolvedScheme = (colorScheme ?? 'light') as 'light' | 'dark';
  const { user, userEmail, isAuthenticated, refreshAuth } = useAuth();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [conversations, setConversations] = useState<Array<{ id: string; title: string }>>([
    { id: 'c1', title: 'Dr. Jones' },
    { id: 'c2', title: 'Care Team' },
  ]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newConvQuery, setNewConvQuery] = useState('');
  const specialists = useMemo(
    () => [
      { id: 's1', name: 'Dr. Emily Jones, MD' },
      { id: 's2', name: 'Dr. Aaron Patel, DO' },
      { id: 's3', name: 'NP Sarah Kim' },
      { id: 's4', name: 'Care Team' },
    ],
    []
  );

  // Refresh auth state when route changes (e.g., after login/verification)
  useEffect(() => {
    refreshAuth();
  }, [state.index, refreshAuth]);

  // Separate regular tabs from bottom tabs
  // Bottom tabs are always "get-care" and "account" regardless of position
  const bottomTabs = state.routes
    .filter(route => route.name === 'get-care' || route.name === 'account')
    .sort((a, b) => {
      // Ensure "get-care" comes before "account"
      if (a.name === 'get-care') return -1;
      if (b.name === 'get-care') return 1;
      return 0;
    });
  // Filter regular tabs: exclude bottom tabs
  // - If authenticated: exclude Pricing and About
  // - If NOT authenticated: exclude Schedule, Messages, Notifications
  // Sort to ensure correct order: Home, Pricing, About (if not logged in), Schedule, Messages, Notifications (if logged in)
  const tabOrder = ['index', 'pricing', 'about', 'schedule', 'messages', 'notifications'];
  const regularTabs = state.routes
    .filter(route => {
      const isBottomTab = route.name === 'get-care' || route.name === 'account';
      const shouldHideWhenLoggedIn = route.name === 'pricing' || route.name === 'about';
      const shouldHideWhenLoggedOut = route.name === 'schedule' || route.name === 'messages' || route.name === 'notifications';
      if (isBottomTab) return false;
      if (isAuthenticated && shouldHideWhenLoggedIn) return false;
      if (!isAuthenticated && shouldHideWhenLoggedOut) return false;
      return true;
    })
    .sort((a, b) => {
      const indexA = tabOrder.indexOf(a.name);
      const indexB = tabOrder.indexOf(b.name);
      // If both in order array, sort by order
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only one in order array, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Neither in order array, maintain original order
      return 0;
    });

  const messagesRoute = useMemo(() => state.routes.find(r => r.name === 'messages'), [state.routes]);
  const messagesIndex = useMemo(() => (messagesRoute ? state.routes.findIndex(r => r.key === messagesRoute.key) : -1), [state.routes, messagesRoute]);
  const isMessagesFocused = messagesIndex !== -1 && state.index === messagesIndex;

  const handleSearchToggle = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery('');
    }
  };

  const handleAccountPress = () => {
    if (isAuthenticated && user) {
      // Show logout menu if authenticated
      setShowLogoutMenu(true);
    } else {
      // Navigate to account screen if not authenticated
      const accountRoute = state.routes.find(route => route.name === 'account');
      if (accountRoute) {
        const event = navigation.emit({
          type: 'tabPress',
          target: accountRoute.key,
          canPreventDefault: true,
        });

        if (!event.defaultPrevented) {
          navigation.navigate(accountRoute.name, accountRoute.params);
        }
      }
    }
  };

  const navigateToMessages = (params?: Record<string, any>) => {
    const route = state.routes.find(r => r.name === 'messages');
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      (navigation as any).navigate('messages', params ?? {});
    }
  };

  const navigateHome = () => {
    const route = state.routes.find(r => r.name === 'index');
    if (!route) return;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      (navigation as any).navigate('index');
    }
  };

  useEffect(() => {
    if (isMessagesFocused && !selectedConversationId && conversations.length > 0) {
      const firstId = conversations[0].id;
      setSelectedConversationId(firstId);
      navigateToMessages({ conversationId: firstId });
    }
  }, [isMessagesFocused, selectedConversationId, conversations]);

  const handleCreateConversation = () => {
    setNewConvQuery('');
    setShowNewConversationModal(true);
  };

  const handleSelectSpecialistForNew = (specialistName: string) => {
    // Reuse existing conversation by title if present
    const existing = conversations.find(c => c.title === specialistName);
    if (existing) {
      setSelectedConversationId(existing.id);
      setShowNewConversationModal(false);
      navigateToMessages({ conversationId: existing.id });
      return;
    }
    const newId = `c_${Date.now()}`;
    const newConv = { id: newId, title: specialistName };
    const next = [newConv, ...conversations];
    setConversations(next);
    setSelectedConversationId(newId);
    setShowNewConversationModal(false);
    navigateToMessages({ conversationId: newId });
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    navigateToMessages({ conversationId: id });
  };

  const handleLogout = async () => {
    setShowLogoutMenu(false);
    try {
      const result = await handleSignOut();
      if (result.success) {
        await refreshAuth();
        // Navigate to account screen after logout
        const accountRoute = state.routes.find(route => route.name === 'account');
        if (accountRoute) {
          navigation.navigate(accountRoute.name, accountRoute.params);
        }
      } else {
        Alert.alert('Error', 'Failed to log out. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during logout.');
    }
  };

  return (
    <View style={[
      styles.container,
      isSearchExpanded && styles.expandedContainer,
      isMessagesFocused && styles.messagesExpandedContainer,
    ]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: Colors[resolvedScheme].text }]}>
          TeleMed
        </Text>
        {isSearchExpanded && (
          <TouchableOpacity onPress={handleSearchToggle} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearchExpanded ? (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search specialists, specialties..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <ScrollView style={styles.searchResults}>
            {searchQuery.trim() ? (
              <View style={styles.searchResultItem}>
                <Text style={styles.searchResultText}>Search for: {searchQuery}</Text>
              </View>
            ) : (
              <View style={styles.searchHint}>
                <Text style={styles.searchHintText}>
                  Try searching for specialists by name or specialty
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : isMessagesFocused ? (
        <View style={styles.messagesContainer}>
          <View style={styles.messagesHeaderRow}>
            <Text style={styles.messagesTitle}>Conversations</Text>
            <View style={styles.messagesHeaderActions}>
              <TouchableOpacity onPress={navigateHome} style={styles.closeMessagesButton} accessibilityRole="button" accessibilityLabel="Close messages and go home">
                <Text style={styles.closeMessagesButtonLabel}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateConversation} style={styles.newConversationButton} accessibilityRole="button" accessibilityLabel="New conversation">
                <Text style={styles.newConversationButtonLabel}>+ New</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.conversationList}>
            {conversations.map(conv => {
              const isSelected = conv.id === selectedConversationId;
              return (
                <TouchableOpacity
                  key={conv.id}
                  onPress={() => handleSelectConversation(conv.id)}
                  style={[styles.conversationItem, isSelected && styles.activeConversationItem]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.conversationTitle, isSelected && styles.activeConversationTitle]} numberOfLines={1}>
                    {conv.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {conversations.length === 0 && (
              <View style={styles.emptyConversations}>
                <Text style={styles.emptyConversationsText}>No conversations yet</Text>
                <TouchableOpacity onPress={handleCreateConversation}>
                  <Text style={styles.emptyConversationsAction}>Start one</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.tabsContainer}>
          {regularTabs.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title !== undefined 
              ? options.title 
              : capitalizeFirst(route.name);

            const routeIndex = state.routes.findIndex(r => r.key === route.key);
            const isFocused = state.index === routeIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <React.Fragment key={route.key}>
                <PlatformPressable
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  pressOpacity={1}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  onPressIn={(ev) => {
                    if (process.env.EXPO_OS === 'ios') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={[
                    styles.tabButton,
                    isFocused && styles.activeTabButton
                  ]}
                  android_ripple={null}
                  pressRetentionOffset={0}
                >
                  <Text style={[
                    styles.tabLabel,
                    { 
                      color: isFocused ? 'black' : '#666666'
                    }
                  ]}>
                    {label}
                  </Text>
                </PlatformPressable>
                
                {/* Add search button after Home tab (first tab) */}
                {route.name === 'index' && (
                  <TouchableOpacity
                    onPress={handleSearchToggle}
                    style={styles.searchButton}
                    accessibilityRole="button"
                    accessibilityLabel="Search"
                  >
                    <Text style={styles.searchButtonLabel}>Search</Text>
                  </TouchableOpacity>
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
      
      <View style={styles.bottomButtons}>
        {bottomTabs.map((route, index) => {
          const { options } = descriptors[route.key];
          const isGetCare = route.name === 'get-care';
          const isAccount = route.name === 'account';
          
          // For account button, show email if authenticated, otherwise show "Account"
          const label = isAccount && isAuthenticated && userEmail
            ? userEmail
            : typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title !== undefined 
            ? options.title 
            : capitalizeFirst(route.name);

          const routeIndex = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            if (isAccount && isAuthenticated) {
              handleAccountPress();
            } else {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <PlatformPressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              pressOpacity={1}
              onPress={onPress}
              onLongPress={onLongPress}
              onPressIn={(ev) => {
                if (process.env.EXPO_OS === 'ios') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[
                isGetCare ? styles.getCareButton : styles.accountButton,
                isFocused && (isGetCare ? styles.activeGetCareButton : styles.activeBottomButton)
              ]}
              android_ripple={null}
              pressRetentionOffset={0}
            >
              <Text 
                style={[
                  isGetCare ? styles.getCareText : styles.accountText,
                  isFocused && styles.activeBottomText,
                  isAccount && isAuthenticated && userEmail && styles.accountEmailText
                ]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {label}
              </Text>
            </PlatformPressable>
          );
        })}
      </View>

      {/* Logout Menu Modal */}
      <Modal
        visible={showNewConversationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewConversationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNewConversationModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.newConvContainer}>
              <Text style={styles.newConvTitle}>Start a new conversation</Text>
              <TextInput
                style={styles.newConvInput}
                placeholder="Search specialists..."
                placeholderTextColor="#9CA3AF"
                value={newConvQuery}
                onChangeText={setNewConvQuery}
                autoFocus
              />
              <ScrollView style={styles.newConvResults} keyboardShouldPersistTaps="handled">
                {specialists
                  .filter(s => s.name.toLowerCase().includes(newConvQuery.toLowerCase()))
                  .map(s => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => handleSelectSpecialistForNew(s.name)}
                      style={styles.newConvResultItem}
                    >
                      <Text style={styles.newConvResultText}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                {specialists.filter(s => s.name.toLowerCase().includes(newConvQuery.toLowerCase())).length === 0 && (
                  <View style={styles.newConvEmpty}>
                    <Text style={styles.newConvEmptyText}>No matches</Text>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity style={styles.newConvCancel} onPress={() => setShowNewConversationModal(false)}>
                <Text style={styles.newConvCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Logout Menu Modal */}
      <Modal
        visible={showLogoutMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLogoutMenu(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
              >
                <Text style={styles.menuItemText}>Log Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => setShowLogoutMenu(false)}
              >
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    paddingTop: 20,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  expandedContainer: {
    width: 500,
  },
  messagesExpandedContainer: {
    width: 380,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 19,
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  closeButton: {
    padding: 8,
    paddingRight: 12,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '600',
  },
  tabsContainer: {
    flex: 1,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTabButton: {
    borderColor: 'black',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  searchContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  searchResults: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  messagesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  messagesHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  closeMessagesButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closeMessagesButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  newConversationButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  newConversationButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  conversationList: {
    flex: 1,
  },
  conversationItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
  },
  activeConversationItem: {
    borderColor: 'black',
  },
  conversationTitle: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  activeConversationTitle: {
    fontWeight: '600',
  },
  emptyConversations: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyConversationsText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
  },
  emptyConversationsAction: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultText: {
    fontSize: 14,
    color: '#333',
  },
  searchHint: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  searchHintText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  bottomButtons: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  getCareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#FFE5E5',
  },
  getCareText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'red',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#F5F5F5',
  },
  accountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeBottomButton: {
    borderWidth: 1,
    borderColor: 'black',
  },
  activeGetCareButton: {
    borderWidth: 1,
    borderColor: 'red',
  },
  activeBottomText: {
    fontWeight: '600',
  },
  accountEmailText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '500',
    textAlign: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  newConvContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: 420,
    maxWidth: '90%',
  },
  newConvTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  newConvInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  newConvResults: {
    maxHeight: 320,
  },
  newConvResultItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  newConvResultText: {
    fontSize: 14,
    color: '#111827',
  },
  newConvEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  newConvEmptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  newConvCancel: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  newConvCancelText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
});
