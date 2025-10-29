import { getCurrentAuthUser } from '@/lib/auth';
import { type AuthUser } from 'aws-amplify/auth';
import { useCallback, useEffect, useState } from 'react';

/**
 * Custom hook for managing authentication state
 * Provides reactive auth state and user information
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
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
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null);
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

  return {
    user,
    isAuthenticated,
    isLoading,
    refreshAuth: fetchCurrentUser,
  };
}

