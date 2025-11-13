import { getCurrentAuthUser } from '@/lib/auth';
import { type AuthUser, fetchUserAttributes } from 'aws-amplify/auth';
import { useCallback, useEffect, useState } from 'react';

/**
 * Custom hook for managing authentication state
 * Provides reactive auth state and user information
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Fetch current user and update state
   */
  const fetchCurrentUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const { user, error } = await getCurrentAuthUser();
      if (user && !error) {
        setUser(user);
        setIsAuthenticated(true);
        // Fetch user attributes to get email
        try {
          const attributes = await fetchUserAttributes();
          setUserEmail(attributes.email || user.signInDetails?.loginId || user.username || '');
        } catch (attrError) {
          // Fallback to username if attributes can't be fetched
          setUserEmail(user.signInDetails?.loginId || user.username || '');
        }
      } else {
        setUser(null);
        setUserEmail('');
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
      setUserEmail('');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Extract userId from user object
  const userId = user?.userId || user?.username || null;

  return {
    user,
    userId,
    userEmail,
    isAuthenticated,
    isLoading,
    refreshAuth: fetchCurrentUser,
  };
}

