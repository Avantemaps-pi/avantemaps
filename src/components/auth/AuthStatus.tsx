
import React from 'react';
import { useAuth } from '@/context/auth';
import { Shield, WifiOff, Code } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { shouldBypassAuth } from '@/config/environment';

const AuthStatus: React.FC = () => {
  const { isAuthenticated, user, isLoading, isOffline } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
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
      <div className="flex items-center space-x-2">
        {shouldBypassAuth() && (
          <div className="flex items-center space-x-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
            <Code className="h-3 w-3" />
            <span>DEV</span>
          </div>
        )}
        <span className="text-sm hidden md:inline-block">{user.username}</span>
      </div>
    );
  }

  // Login button removed (now in sidebar)
  return null;
};

export default AuthStatus;
