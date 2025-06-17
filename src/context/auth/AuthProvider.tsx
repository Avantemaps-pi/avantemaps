
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, SubscriptionTier, PiUser } from './types';
import { authService } from './authService';
import { networkStatusService } from './networkStatusService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Development bypass - set to true to allow access without login
  const BYPASS_AUTH = true;

  useEffect(() => {
    if (BYPASS_AUTH) {
      setIsLoading(false);
      return;
    }

    // Only set up Supabase auth if not bypassing
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        setSession(session);
        
        // Convert Supabase User to PiUser if needed
        if (session?.user) {
          const piUser: PiUser = {
            uid: session.user.id,
            username: session.user.email || session.user.id,
            accessToken: session.access_token,
            lastAuthenticated: Date.now(),
            subscriptionTier: SubscriptionTier.INDIVIDUAL,
            walletAddress: undefined,
            roles: undefined
          };
          setUser(piUser);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
        setAuthError(null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        const piUser: PiUser = {
          uid: session.user.id,
          username: session.user.email || session.user.id,
          accessToken: session.access_token,
          lastAuthenticated: Date.now(),
          subscriptionTier: SubscriptionTier.INDIVIDUAL,
          walletAddress: undefined,
          roles: undefined
        };
        setUser(piUser);
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = async () => {
    if (BYPASS_AUTH) return;
    
    try {
      setAuthError(null);
      // For now, just use a simple Supabase sign in
      // You can implement Pi Network auth later
      console.log('Login attempted but bypassed');
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    if (BYPASS_AUTH) return;
    
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshUserData = async () => {
    if (BYPASS_AUTH) {
      console.log('Auth bypassed, skipping user data refresh');
      return;
    }
    
    try {
      setIsLoading(true);
      // In bypass mode, we don't need to refresh anything
      // In real implementation, this would refresh user data from Pi Network or Supabase
      console.log('Refreshing user data...');
    } catch (error) {
      console.error('Error refreshing user data:', error);
      setAuthError(error instanceof Error ? error.message : 'Failed to refresh user data');
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccess = (tier: SubscriptionTier): boolean => {
    if (BYPASS_AUTH) return true;
    return user?.subscriptionTier === tier || user?.subscriptionTier === SubscriptionTier.ORGANIZATION;
  };

  const value: AuthContextType = {
    user,
    session,
    isAuthenticated: BYPASS_AUTH || !!user,
    isLoading,
    authError,
    isOffline: isOffline || networkStatusService.isOffline(),
    login,
    logout,
    refreshUserData,
    hasAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
