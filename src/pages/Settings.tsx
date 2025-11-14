
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import ProfileSettings from '@/components/settings/ProfileSettings';
import AppPreferences from '@/components/settings/AppPreferences';
import DangerZone from '@/components/settings/DangerZone';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Settings = () => {
  const isMobile = useIsMobile();
  const {
    user,
    refreshUserData,
    isLoading
  } = useAuth();
  useSessionTimeout();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'english';
  });
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notifications') === 'false' ? false : true;
  });
  const [colorScheme, setColorScheme] = useState<'system' | 'light' | 'dark'>(() => {
    return localStorage.getItem('colorScheme') as 'system' | 'light' | 'dark' || 'system';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedScheme = localStorage.getItem('colorScheme');
    if (savedScheme === 'dark') return true;
    if (savedScheme === 'light') return false;
    return false;
  });
  const [isAccountDeleted, setIsAccountDeleted] = useState(() => {
    return localStorage.getItem('accountDeleted') === 'true';
  });

  // Track initial values to compare for changes
  const [initialValues, setInitialValues] = useState({
    language: language,
    notifications: notifications,
    colorScheme: colorScheme
  });

  // Only refresh user data on first render if we don't have user data
  // This prevents unnecessary API calls when navigating to Settings repeatedly
  useEffect(() => {
    // Check for last refresh timestamp in localStorage
    const lastUserRefresh = localStorage.getItem('last_user_refresh');
    const refreshThreshold = 30 * 60 * 1000; // 30 minutes
    const shouldRefresh = !lastUserRefresh || Date.now() - parseInt(lastUserRefresh, 10) > refreshThreshold;

    // Only attempt refresh if needed and if we have a user
    if (user && shouldRefresh && !isLoading) {
      refreshUserData();
      localStorage.setItem('last_user_refresh', Date.now().toString());
    }

    // Save the current values to compare against later
    setInitialValues({
      language,
      notifications,
      colorScheme
    });
  }, []);
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  useEffect(() => {
    if (colorScheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [colorScheme]);
  const handleColorSchemeChange = (scheme: 'system' | 'light' | 'dark') => {
    setColorScheme(scheme);
    localStorage.setItem('colorScheme', scheme);
    if (scheme === 'dark') {
      setIsDarkMode(true);
    } else if (scheme === 'light') {
      setIsDarkMode(false);
    } else {
      // For system theme, check the media query
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  };
  const handleSaveSettings = () => {
    // Check if any values have actually changed before saving
    const hasChanges = initialValues.language !== language || initialValues.notifications !== notifications || initialValues.colorScheme !== colorScheme;
    if (hasChanges) {
      localStorage.setItem('language', language);
      localStorage.setItem('notifications', String(notifications));

      // Update the initial values to the new ones
      setInitialValues({
        language,
        notifications,
        colorScheme
      });
      toast.success('Settings saved successfully!');
    } else {
      toast.info('No changes detected');
    }
  };
  const handleDeleteAccount = () => {
    setIsAccountDeleted(true);
    localStorage.setItem('accountDeleted', 'true');
    toast.error('Account scheduled for deletion', {
      description: 'Your account will be permanently deleted after 15 days. You can reinstate it before then.'
    });
  };
  const handleReinstateAccount = () => {
    setIsAccountDeleted(false);
    localStorage.removeItem('accountDeleted');
    toast.success('Account has been reinstated', {
      description: 'Your account has been successfully reactivated.'
    });
  };
  return (
    <AppLayout title="" fullWidth={true} className="overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-hidden">
        <div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Manage your account preferences.</p>
        </div>

        <Accordion type="multiple" defaultValue={["profile"]} className="mt-4 sm:mt-6 space-y-4 overflow-hidden">
          <AccordionItem value="profile" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold text-base sm:text-lg">Profile Settings</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Manage your personal information</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pt-2 pb-4">
              <ProfileSettings 
                language={language} 
                setLanguage={setLanguage} 
                isMobile={isMobile} 
                user={user} 
                isLoading={isLoading} 
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="preferences" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold text-base sm:text-lg">App Preferences</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Customize your experience</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pt-2 pb-4">
              <AppPreferences 
                notifications={notifications} 
                setNotifications={setNotifications} 
                isDarkMode={isDarkMode} 
                colorScheme={colorScheme} 
                onColorSchemeChange={handleColorSchemeChange} 
                onSaveSettings={handleSaveSettings} 
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="danger" className="border rounded-lg overflow-hidden border-destructive/20">
            <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex flex-col items-start text-left">
                <span className="font-semibold text-base sm:text-lg text-destructive">Danger Zone</span>
                <span className="text-xs sm:text-sm text-muted-foreground">Account deletion and recovery</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pt-2 pb-4">
              <DangerZone 
                onDeleteAccount={handleDeleteAccount} 
                onReinstateAccount={handleReinstateAccount} 
                isAccountDeleted={isAccountDeleted} 
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </AppLayout>
  );
};

export default Settings;
