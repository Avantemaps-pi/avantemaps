
import React from 'react';
import { useAuth } from '@/context/auth';
import { Shield, WifiOff } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const AuthStatus: React.FC = () => {
  const { isAuthenticated, user, isLoading, isOffline } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Authenticating...</span>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="flex items-center space-x-1 text-sm text-amber-500">
        <WifiOff className="h-4 w-4" />
        <span>Offline</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center">
        <span className="text-sm hidden md:inline-block">{user.username}</span>
      </div>
    );
  }

  // Login button removed (now in sidebar)
  return null;
};

export default AuthStatus;
