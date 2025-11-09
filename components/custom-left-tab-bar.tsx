import type { Schema } from '@/amplify/data/resource';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { handleSignOut } from '@/lib/auth';
import { createConversation, getUserConversations } from '@/lib/messaging';
import Octicons from '@expo/vector-icons/Octicons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { generateClient } from 'aws-amplify/data';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const client = generateClient<Schema>();

// Helper function to capitalize the first letter of a string
const capitalizeFirst = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Helper function to get icon name for each route
const getIconName = (routeName: string): string => {
  const iconMap: Record<string, string> = {
    'index': 'home',
    'pricing': 'credit-card',
    'about': 'info',
    'schedule': 'calendar',
    'medical-records': 'file',
    'prescriptions': 'beaker',
    'messages': 'comment',
    'notifications': 'bell',
    'get-care': 'plus-circle',
    'account': 'person',
  };
  return iconMap[routeName] || 'circle';
};

export function CustomLeftTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const resolvedScheme = (colorScheme ?? 'light') as 'light' | 'dark';
  const { user, userEmail, isAuthenticated, refreshAuth } = useAuth();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messagesQuery, setMessagesQuery] = useState('');
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [conversations, setConversations] = useState<Array<{ id: string; title: string }>>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [newConvQuery, setNewConvQuery] = useState('');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userLocation, setUserLocation] = useState<{ city: string; state: string } | null>(null);
  const accountButtonRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Refresh auth state when route changes (e.g., after login/verification)
  useEffect(() => {
    refreshAuth();
  }, [state.index, refreshAuth]);

  // Fetch user location when authenticated
  useEffect(() => {
    const fetchLocation = async () => {
      if (!isAuthenticated) {
        setUserLocation(null);
        return;
      }

      try {
        // Check if location services are enabled
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          console.log('[LOCATION] Location services are disabled');
          setUserLocation(null);
          return;
        }

        // Request foreground permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[LOCATION] Permission not granted, status:', status);
          setUserLocation(null);
          return;
        }

        // Get current position with better accuracy settings
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Balanced accuracy for better performance
        });

        console.log('[LOCATION] Position obtained:', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        });

        // Reverse geocode to get address
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        console.log('[LOCATION] Reverse geocode result:', JSON.stringify(reverseGeocode, null, 2));
        
        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          const locationData = {
            city: addr.city || addr.subregion || addr.district || '',
            state: addr.region || addr.subregion || '',
          };
          console.log('[LOCATION] Setting location:', locationData);
          // Only set if we have at least city or state
          if (locationData.city || locationData.state) {
            setUserLocation(locationData);
          } else {
            console.log('[LOCATION] No valid city or state found in geocode result');
            setUserLocation(null);
          }
        } else {
          console.log('[LOCATION] No geocode results');
          setUserLocation(null);
        }
      } catch (error) {
        console.error('[LOCATION] Error fetching location:', error);
        // Don't show alert to user, just log and set location to null
        setUserLocation(null);
      }
    };

    fetchLocation();
  }, [isAuthenticated]);

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
  const tabOrder = ['index', 'pricing', 'about', 'schedule', 'messages', 'medical-records', 'prescriptions'];
  const regularTabs = state.routes
    .filter(route => {
      const isBottomTab = route.name === 'get-care' || route.name === 'account';
      const shouldHideWhenLoggedIn = route.name === 'pricing' || route.name === 'about';
      const shouldHideWhenLoggedOut = route.name === 'schedule' || route.name === 'medical-records' || route.name === 'prescriptions' || route.name === 'messages' || route.name === 'notifications';
      const isSpecialist = route.name === 'specialist';
      if (route.name === 'notifications') return false;
      if (isBottomTab) return false;
      if (isSpecialist) return false;
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
  const isMessagesExpanded = isMessagesFocused && !isSearchExpanded;

  // Close search when navigating TO messages tab (not when already on messages)
  const prevMessagesFocused = useRef(false);
  useEffect(() => {
    // Only close search if we just navigated TO messages (was false, now true)
    if (!prevMessagesFocused.current && isMessagesFocused && isSearchExpanded) {
      setIsSearchExpanded(false);
      setSearchQuery('');
    }
    prevMessagesFocused.current = isMessagesFocused;
  }, [isMessagesFocused, isSearchExpanded]);

  const handleSearchToggle = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newState = !isSearchExpanded;
    
    // If messages is active and we're opening search, navigate to home first
    if (isMessagesFocused && newState) {
      navigateHome();
      // Small delay to allow navigation to complete before expanding search
      setTimeout(() => {
        setIsSearchExpanded(newState);
        if (!newState) {
          setSearchQuery('');
        }
        
        // Animate the slide
        Animated.timing(slideAnim, {
          toValue: newState ? 1 : 0,
          duration: 300,
          useNativeDriver: false, // width animations need layout driver
        }).start();
      }, 50);
      return;
    }
    
    setIsSearchExpanded(newState);
    if (!newState) {
      setSearchQuery('');
    }
    
    // Animate the slide
    Animated.timing(slideAnim, {
      toValue: newState ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // width animations need layout driver
    }).start();
  };

  // Calculate animated values
  // Collapsed width: 12px (container padding) + 12px (button padding) + 18px (icon) + 12px (button padding) + 12px (container padding) = 66px
  // When search is expanded: 66px (collapsed tabs) + 350px (search width) = 416px
  // Container width includes search area when expanded
  const tabBarWidth = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [260, 66],
  });
  
  const containerWidth = useMemo(() => {
    if (isSearchExpanded || isMessagesExpanded) {
      // When search or messages is expanded: 66px tabs + 350px panel = 416px
      return slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [260, 416],
      });
    } else {
      // Normal: just the tab bar width
      return tabBarWidth;
    }
  }, [isSearchExpanded, isMessagesExpanded, slideAnim, tabBarWidth]);

  const searchContainerOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const searchContainerWidth = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const searchLeftPosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [260, 66],
  });

  const textOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  const headerOpacity = slideAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0],
  });

  // Auto-collapse/expand tab bar when messages or search is focused
  useEffect(() => {
    const shouldCollapse = isMessagesExpanded || isSearchExpanded;
    Animated.timing(slideAnim, {
      toValue: shouldCollapse ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isMessagesExpanded, isSearchExpanded]);

  const handleAccountPress = () => {
    if (isAuthenticated && user) {
      // Get button position for popup placement
      if (accountButtonRef.current) {
        accountButtonRef.current.measureInWindow((x, y, width, height) => {
          // Position menu below the button with additional offset
          setMenuPosition({
            x,
            y: y + height - 155,
          });
          setShowLogoutMenu(true);
        });
      } else {
        setShowLogoutMenu(true);
      }
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

  /**
   * Load conversations from DynamoDB when messages panel is expanded
   * 
   * This effect loads the user's conversations from DynamoDB when they open the messages panel.
   * It runs when the messages panel becomes visible (isMessagesExpanded).
   */
  useEffect(() => {
    const loadConversations = async () => {
      if (!isMessagesExpanded || !isAuthenticated) {
        return;
      }

      try {
        setIsLoadingConversations(true);
        console.log('[CONVERSATIONS] Loading conversations from DynamoDB');

        // Load conversations from DynamoDB using the messaging service
        const userConversations = await getUserConversations();

        // Update local conversations list
        setConversations(
          userConversations.map(conv => ({
            id: conv.id,
            title: conv.name,
          }))
        );

        console.log(`[CONVERSATIONS] Loaded ${userConversations.length} conversations`);
      } catch (error) {
        console.error('[CONVERSATIONS] Error loading conversations:', error);
        // Don't show alert - just log the error
        // Conversations list will remain empty
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadConversations();
  }, [isMessagesExpanded, isAuthenticated]);

  /**
   * Auto-select first conversation when messages panel opens
   * 
   * This effect automatically selects and navigates to the first conversation
   * when the messages panel is focused and there are conversations available.
   */
  useEffect(() => {
    if (isMessagesFocused && !selectedConversationId && conversations.length > 0) {
      const firstId = conversations[0].id;
      setSelectedConversationId(firstId);
      navigateToMessages({ conversationId: firstId });
    }
  }, [isMessagesFocused, selectedConversationId, conversations]);

  const handleCreateConversation = () => {
    setNewConvQuery('');
    setSearchResults([]);
    setShowNewConversationModal(true);
  };

  // Debounced search for doctors/specialists
  useEffect(() => {
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, clear results
    if (!newConvQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Set loading state
    setIsSearching(true);

    // Debounce the search query
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = newConvQuery.trim().toLowerCase();
        
        // Fetch all specialists from the database
        const allSpecialists = await client.models.Specialist.list();
        
        // Filter specialists by name (first_name or last_name contains the query)
        // Only show active specialists
        const filtered = allSpecialists.data
          .filter(specialist => {
            const firstName = specialist.first_name?.toLowerCase() || '';
            const lastName = specialist.last_name?.toLowerCase() || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            // Check if query matches first name, last name, or full name
            return (
              (specialist.status === 'active' || specialist.status === 'pending') &&
              (firstName.includes(query) || 
               lastName.includes(query) || 
               fullName.includes(query))
            );
          })
          .map(specialist => ({
            id: specialist.id,
            name: `Dr. ${specialist.first_name} ${specialist.last_name}`,
          }))
          .slice(0, 20); // Limit to 20 results for performance

        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching specialists:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce delay

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [newConvQuery]);

  /**
   * Handle selecting a specialist to start a new conversation
   * 
   * This function:
   * 1. Checks if a conversation already exists with this specialist
   * 2. Fetches the specialist's user_id from DynamoDB
   * 3. Creates a new conversation in DynamoDB via Chime SDK Messaging
   * 4. Navigates to the newly created conversation
   * 
   * @param specialistId - Specialist ID from DynamoDB
   * @param specialistName - Display name of the specialist
   */
  const handleSelectSpecialistForNew = async (specialistId: string, specialistName: string) => {
    // Check if conversation already exists by searching in DynamoDB
    // For now, we'll check local conversations first, then create if not found
    const existing = conversations.find(c => c.title === specialistName);
    if (existing) {
      setSelectedConversationId(existing.id);
      setShowNewConversationModal(false);
      navigateToMessages({ conversationId: existing.id });
      return;
    }

    try {
      setIsCreatingConversation(true);

      // Get current user ID
      const currentUserId = user?.userId || user?.username;
      if (!currentUserId) {
        Alert.alert('Error', 'You must be logged in to start a conversation.');
        setIsCreatingConversation(false);
        return;
      }

      // Fetch specialist from DynamoDB to get their user_id (Cognito user ID)
      console.log('[CONVERSATION] Fetching specialist:', specialistId);
      const { data: specialist, errors: specialistErrors } = await client.models.Specialist.get({
        id: specialistId,
      });

      if (specialistErrors || !specialist) {
        throw new Error('Specialist not found');
      }

      if (!specialist.user_id) {
        throw new Error('Specialist user ID not available');
      }

      const specialistUserId = specialist.user_id;

      // Check if conversation already exists in DynamoDB
      // Use getUserConversations to get all conversations for current user
      // Then filter for conversations with this specialist
      const allConversations = await getUserConversations();

      // Check if conversation with this specialist already exists
      // For direct conversations, both participants must be present
      const existingConversation = allConversations.find(conv => 
        conv.type === 'direct' &&
        conv.participantIds.includes(currentUserId) && 
        conv.participantIds.includes(specialistUserId)
      );

      if (existingConversation) {
        console.log('[CONVERSATION] Existing conversation found:', existingConversation.id);
        setSelectedConversationId(existingConversation.id);
        setShowNewConversationModal(false);
        navigateToMessages({ conversationId: existingConversation.id });
        setIsCreatingConversation(false);
        return;
      }

      // Create new conversation in DynamoDB via Chime SDK Messaging
      console.log('[CONVERSATION] Creating new conversation with:', {
        currentUserId,
        specialistUserId,
        specialistName,
      });

      // Close modal first
      setShowNewConversationModal(false);

      // Create the conversation - this creates both the Chime SDK channel and DynamoDB record
      console.log('[CONVERSATION] Starting conversation creation...');
      
      const newConversation = await createConversation(
        [currentUserId, specialistUserId], // Participant IDs
        specialistName, // Conversation name
        'direct' // Type: direct message
      );

      // Verify conversation was created with valid ID
      if (!newConversation || !newConversation.id) {
        throw new Error('Conversation creation failed: No conversation ID returned');
      }

      console.log('[CONVERSATION] Conversation created successfully:', {
        id: newConversation.id,
        channelArn: newConversation.channelArn,
        name: newConversation.name,
      });

      // Update local conversations list immediately so it appears in the sidebar
      const newConv = { id: newConversation.id, title: specialistName };
      setConversations(prev => {
        // Check if already exists to avoid duplicates
        const exists = prev.find(c => c.id === newConversation.id);
        if (exists) return prev;
        // Add to beginning of list (most recent first)
        return [newConv, ...prev];
      });
      
      // Set as selected conversation
      setSelectedConversationId(newConversation.id);
      
      // Navigate immediately to open the messaging room
      // The messages screen will load the conversation details and be ready to send messages
      console.log('[CONVERSATION] Navigating to conversation:', newConversation.id);
      navigateToMessages({ conversationId: newConversation.id });
      
      setIsCreatingConversation(false);
    } catch (error) {
      console.error('[CONVERSATION] Error creating conversation:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create conversation. Please try again.'
      );
      setIsCreatingConversation(false);
    }
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

  const handleNotificationsPress = () => {
    setShowLogoutMenu(false);
    const notificationsRoute = state.routes.find(route => route.name === 'notifications');
    if (notificationsRoute) {
      const event = navigation.emit({
        type: 'tabPress',
        target: notificationsRoute.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(notificationsRoute.name, notificationsRoute.params);
      }
    }
  };

  const handleSettingsPress = () => {
    setShowLogoutMenu(false);
    const settingsRoute = state.routes.find(route => route.name === 'settings');
    if (settingsRoute) {
      const event = navigation.emit({
        type: 'tabPress',
        target: settingsRoute.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(settingsRoute.name, settingsRoute.params);
      }
    } else {
      const accountRoute = state.routes.find(route => route.name === 'account');
      if (accountRoute) {
        navigation.navigate(accountRoute.name, { screen: 'settings' });
      }
    }
  };

  return (
    <>
    <Animated.View style={[
      styles.container,
      {
        width: containerWidth,
      }
    ]}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            width: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [260, 66],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.headerRow,
            { opacity: headerOpacity },
          ]}
          pointerEvents={isSearchExpanded || isMessagesExpanded ? 'none' : 'auto'}
        >
          <Text style={[styles.title, { color: Colors[resolvedScheme].text }]}>
            TeleMed
          </Text>
        </Animated.View>

        {/* Always render tabs, but animate text opacity */}
        <View style={styles.tabsContainer}>
              {regularTabs.map((route, index) => {
                const { options } = descriptors[route.key];
                const label = typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : options.title !== undefined 
                  ? options.title 
                  : capitalizeFirst(route.name);

                const routeIndex = state.routes.findIndex(r => r.key === route.key);
                // Mark as focused if it's the current route
                // But if search is expanded, only search button should be active (not home tab)
                // If messages is expanded, messages tab should be active
                const isFocused = state.index === routeIndex && 
                  !(isSearchExpanded && route.name === 'index'); // Don't show home as active when search is expanded
                const isHovered = hoveredTab === route.key;

                const onPress = () => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                  
                  // Close search/messages when clicking a tab icon
                  if (isSearchExpanded) {
                    handleSearchToggle();
                  }
                  // If clicking messages tab while messages is expanded, it will navigate which collapses it
                };

                const onLongPress = () => {
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  });
                };

                const textColor = isFocused ? 'black' : (isHovered ? '#333333' : '#666666');
                const iconColor = isFocused ? 'black' : (isHovered ? '#333333' : '#666666');

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
                  {...({
                    onMouseEnter: () => setHoveredTab(route.key),
                    onMouseLeave: () => setHoveredTab(null),
                  } as any)}
                  style={[
                    styles.tabButton,
                    isFocused && styles.activeTabButton
                  ]}
                  android_ripple={null}
                  pressRetentionOffset={0}
                >
                  <Octicons 
                    name={getIconName(route.name) as any} 
                    size={18} 
                    color={iconColor} 
                    style={styles.tabIcon}
                  />
                  <Animated.Text style={[
                    styles.tabLabel,
                    { 
                      color: textColor,
                      opacity: textOpacity,
                    }
                  ]}>
                    {label}
                  </Animated.Text>
                </PlatformPressable>
                
                {/* Add search button after Home tab (first tab) */}
                {route.name === 'index' && (
                  <>
                    <TouchableOpacity
                      onPress={handleSearchToggle}
                      style={[
                        styles.searchButton,
                        // Show active style when search is expanded
                        isSearchExpanded && styles.activeTabButton
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Search"
                      {...({
                        onMouseEnter: () => setHoveredTab('search'),
                        onMouseLeave: () => setHoveredTab(null),
                      } as any)}
                    >
                      <Octicons 
                        name="search" 
                        size={18} 
                        color={isSearchExpanded ? 'black' : (hoveredTab === 'search' ? '#111111' : '#666666')} 
                        style={styles.tabIcon}
                      />
                      <Animated.Text style={[
                        styles.searchButtonLabel,
                        { 
                          color: isSearchExpanded ? 'black' : (hoveredTab === 'search' ? '#111111' : '#666666'),
                          opacity: textOpacity,
                        }
                      ]}>Search</Animated.Text>
                    </TouchableOpacity>
                    <View style={styles.sectionDivider} />
                  </>
                )}
              </React.Fragment>
            );
          })}
            </View>
            
            {/* Bottom buttons with animated text */}
            <View style={styles.bottomButtons}>
                {bottomTabs.map((route, index) => {
                  const { options } = descriptors[route.key];
                  const isGetCare = route.name === 'get-care';
                  const isAccount = route.name === 'account';
                  
                  const label = isAccount && isAuthenticated && userEmail
                    ? userEmail
                    : typeof options.tabBarLabel === 'string'
                    ? options.tabBarLabel
                    : options.title !== undefined 
                    ? options.title 
                    : capitalizeFirst(route.name);

                  const routeIndex = state.routes.findIndex(r => r.key === route.key);
                  // Mark as focused if it's the current route (bottom tabs always show active state)
                  const isFocused = state.index === routeIndex;
                  const isHovered = hoveredTab === route.key;

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

                  const iconColor = isGetCare ? 'white' : (isFocused ? 'black' : (isHovered ? '#333333' : '#666666'));
                  const textColor = isGetCare ? 'white' : (isFocused ? 'black' : (isHovered ? '#333333' : '#666666'));

                  return (
                    <PlatformPressable
                      key={route.key}
                      ref={isAccount ? accountButtonRef : undefined}
                      accessibilityRole="button"
                      accessibilityState={isFocused ? { selected: true } : {}}
                      accessibilityLabel={options.tabBarAccessibilityLabel}
                      pressOpacity={1}
                      onPress={onPress}
                      onPressIn={(ev) => {
                        if (process.env.EXPO_OS === 'ios') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      {...({
                        onMouseEnter: () => setHoveredTab(route.key),
                        onMouseLeave: () => setHoveredTab(null),
                      } as any)}
                      style={[
                        isGetCare ? styles.getCareButton : styles.accountButton,
                        isFocused && (isGetCare ? styles.activeGetCareButton : styles.activeBottomButton)
                      ]}
                      android_ripple={null}
                      pressRetentionOffset={0}
                    >
                      <Octicons 
                        name={isGetCare ? 'plus' : (getIconName(route.name) as any)} 
                        size={18} 
                        color={iconColor} 
                        style={styles.tabIcon}
                      />
                      {isGetCare ? (
                        <Animated.Text 
                          style={[
                            styles.tabLabel,
                            { 
                              color: 'white',
                              opacity: textOpacity,
                            }
                          ]}
                        >
                          {label}
                        </Animated.Text>
                      ) : (
                        <View style={styles.accountButtonContent}>
                          <Animated.Text 
                            style={[
                              styles.accountText,
                              isFocused && styles.activeBottomText,
                              isAccount && isAuthenticated && userEmail && styles.accountEmailText,
                              { color: textColor },
                              { opacity: textOpacity }
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            {label}
                          </Animated.Text>
                          {isAccount && isAuthenticated && (
                            <>
                              {userLocation && (userLocation.city || userLocation.state) ? (
                                <Text 
                                  style={styles.accountLocationText}
                                  numberOfLines={1}
                                >
                                  {[userLocation.city, userLocation.state].filter(Boolean).join(', ')}
                                </Text>
                              ) : (
                                <Text 
                                  style={[styles.accountLocationText, { fontStyle: 'italic', opacity: 0.6 }]}
                                  numberOfLines={1}
                                >
                                  Location unavailable
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                      )}
                    </PlatformPressable>
                  );
                })}
              </View>
            
            {/* Collapsed header icon */}
            <Animated.View
              style={[
                styles.collapsedHeader,
                {
                  opacity: slideAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0, 1],
                  }),
                  position: 'absolute',
                  top: 20,
                  left: 12,
                  pointerEvents: isSearchExpanded ? 'auto' : 'none',
                }
              ]}
            >
              <Octicons 
                name="ai-model" 
                size={24} 
                color="black" 
              />
            </Animated.View>
      </Animated.View>
      
      {/* Search area - appears next to collapsed tabs */}
      {isSearchExpanded && (
        <Animated.View
          style={[
            styles.searchContainer,
            {
              opacity: searchContainerOpacity,
            }
          ]}
        >
          <TextInput
            style={styles.searchInput}
            placeholder="Search specialists, specialties..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
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
        </Animated.View>
      )}

      {/* Messages area - appears next to collapsed tabs */}
      {isMessagesExpanded && (
        <Animated.View
          style={[
            styles.searchContainer,
            {
              opacity: searchContainerOpacity,
            }
          ]}
        >
          <View style={styles.messagesPanelHeader}>
            <Text style={styles.messagesPanelTitle}>Messages</Text>
            <TouchableOpacity onPress={handleCreateConversation} style={styles.newConversationButton} accessibilityRole="button" accessibilityLabel="New conversation">
              <Text style={styles.newConversationButtonLabel}>+ New</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#999"
            value={messagesQuery}
            onChangeText={setMessagesQuery}
            autoFocus={false}
          />
          <ScrollView style={styles.searchResults}>
            {isLoadingConversations ? (
              <View style={styles.emptyConversations}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.emptyConversationsText}>Loading conversations...</Text>
              </View>
            ) : (messagesQuery.trim() 
              ? conversations.filter(conv => conv.title.toLowerCase().includes(messagesQuery.toLowerCase()))
              : conversations
            ).length > 0 ? (
              (messagesQuery.trim() 
                ? conversations.filter(conv => conv.title.toLowerCase().includes(messagesQuery.toLowerCase()))
                : conversations
              ).map(conv => {
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
              })
            ) : (
              <View style={styles.emptyConversations}>
                <Text style={styles.emptyConversationsText}>No conversations yet</Text>
                <TouchableOpacity onPress={handleCreateConversation}>
                  <Text style={styles.emptyConversationsAction}>Start one</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </Animated.View>

    {/* New Conversation Modal */}
      <Modal
        visible={showNewConversationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowNewConversationModal(false);
          setNewConvQuery('');
          setSearchResults([]);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowNewConversationModal(false);
            setNewConvQuery('');
            setSearchResults([]);
          }}
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
                {isSearching ? (
                  <View style={styles.newConvEmpty}>
                    <ActivityIndicator size="small" color="#111827" />
                    <Text style={styles.newConvEmptyText}>Searching...</Text>
                  </View>
                ) : searchResults.length > 0 ? (
                  searchResults.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => handleSelectSpecialistForNew(s.id, s.name)}
                      style={[styles.newConvResultItem, isCreatingConversation && styles.newConvResultItemDisabled]}
                      disabled={isCreatingConversation}
                    >
                      {isCreatingConversation ? (
                        <View style={styles.newConvResultLoading}>
                          <ActivityIndicator size="small" color="#111827" />
                          <Text style={styles.newConvResultText}>Creating...</Text>
                        </View>
                      ) : (
                        <Text style={styles.newConvResultText}>{s.name}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : newConvQuery.trim() ? (
                  <View style={styles.newConvEmpty}>
                    <Text style={styles.newConvEmptyText}>No doctors found</Text>
                  </View>
                ) : (
                  <View style={styles.newConvEmpty}>
                    <Text style={styles.newConvEmptyText}>Start typing to search for doctors</Text>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity style={styles.newConvCancel} onPress={() => {
                setShowNewConversationModal(false);
                setNewConvQuery('');
                setSearchResults([]);
              }}>
                <Text style={styles.newConvCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Account Menu Modal */}
      <Modal
        visible={showLogoutMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowLogoutMenu(false)}
        >
          <View
            style={[
              styles.menuContainer,
              {
                position: 'absolute',
                top: menuPosition.y > 0 ? menuPosition.y : undefined,
                bottom: menuPosition.y <= 0 ? 60 : undefined,
                left: menuPosition.x > 0 ? menuPosition.x : 12,
              }
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.menuContent}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleNotificationsPress}
              >
                <Octicons name="bell" size={14} color="#111827" style={styles.menuItemIcon} />
                <Text style={styles.menuItemTextRegular}>Notifications</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleSettingsPress}
              >
                <Octicons name="gear" size={14} color="#111827" style={styles.menuItemIcon} />
                <Text style={styles.menuItemTextRegular}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={handleLogout}
              >
                <Octicons name="sign-out" size={14} color="#E53E3E" style={styles.menuItemIcon} />
                <Text style={styles.menuItemText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
    overflow: 'visible',
    flexShrink: 0,
  },
  searchLayout: {
    flex: 1,
  },
  animatedContainer: {
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 0,
    backgroundColor: 'white',
    borderRightWidth: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  expandedContainer: {
    width: 500,
  },
  collapsedContainer: {
    width: 'auto',
    paddingHorizontal: 12,
    borderRightWidth: 0,
  },
  messagesPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  messagesPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  collapsedLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  collapsedTabsContainer: {
    width: 48,
    paddingTop: 20,
    paddingLeft: 0,
    paddingRight: 0,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    flexShrink: 0,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  collapsedHeader: {
    paddingLeft: 12,
    paddingBottom: 40,
    paddingTop: 0,
    width: '100%',
  },
  collapsedTabsTop: {
    flexGrow: 1,
  },
  collapsedTabsBottom: {
    paddingTop: 20,
  },
  collapsedTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
    minHeight: 42,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 60,
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
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 9,
    width: '100%',
  },
  activeTabButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  tabIcon: {
    marginRight: 14,
    width: 18,
    height: 18,
  },
  sectionDivider: {
    height: 16,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 9,
    width: '100%',
    justifyContent: 'flex-start',
  },
  searchButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  searchContainer: {
    width: 350,
    paddingBottom: 20,
    paddingTop: 20,
    paddingHorizontal: 24,
    backgroundColor: 'white',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    flexShrink: 0,
    alignSelf: 'stretch',
    flexGrow: 0,
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  searchResults: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingBottom: 20,
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  messagesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingVertical: 9,
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
    paddingBottom: 5,
  },
  getCareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#E50914',
  },
  getCareText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'red',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 9,
  },
  accountButtonContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 20,
  },
  accountLocationText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#999999',
    marginTop: 2,
    opacity: 1,
    lineHeight: 12,
    minHeight: 12,
  },
  accountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
  },
  activeBottomButton: {
    borderRadius: 3,
  },
  activeGetCareButton: {
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#E50914',
    borderRadius: 3,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 3,
    paddingVertical: 4,
    width: 235,
  },
  menuContent: {
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemIcon: {
    marginRight: 12,
    width: 16,
    height: 16,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 12,
    color: '#E53E3E',
    fontWeight: '500',
  },
  menuItemTextRegular: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
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
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 10,
  },
  newConvResults: {
    maxHeight: 320,
  },
  newConvResultItem: {
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  newConvResultItemDisabled: {
    opacity: 0.6,
  },
  newConvResultLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
