
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, SubscriptionTier } from './types';
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
  const [user, setUser] = useState<User | null>(null);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        setAuthError(null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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
      const result = await authService.authenticate(['profile']);
      if (result.user) {
        setUser(result.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  };

  const logout = async () => {
    if (BYPASS_AUTH) return;
    
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const hasAccess = (tier: SubscriptionTier): boolean => {
    if (BYPASS_AUTH) return true;
    return user?.app_metadata?.subscription_tier === tier || user?.app_metadata?.subscription_tier === 'premium';
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
    hasAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
