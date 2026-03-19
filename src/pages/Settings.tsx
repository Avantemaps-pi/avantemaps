
import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProfileSettings from '@/components/settings/ProfileSettings';
import AppPreferences from '@/components/settings/AppPreferences';
import DangerZone from '@/components/settings/DangerZone';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { User, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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

  const [colorScheme, setColorScheme] = useState<'system' | 'light' | 'dark'>(() => {
    return localStorage.getItem('colorScheme') as 'system' | 'light' | 'dark' || 'system';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedScheme = localStorage.getItem('colorScheme');
    if (savedScheme === 'dark') return true;
    if (savedScheme === 'light') return false;
    return false;
  });
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);
  const [deletionDate, setDeletionDate] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("profile");

  // Check if account has a scheduled deletion
  useEffect(() => {
    const checkDeletionStatus = async () => {
      if (!user?.uid) return;
      const { data, error } = await supabase
        .from('users')
        .select('scheduled_deletion_at')
        .eq('id', user.uid)
        .single();

      if (!error && data?.scheduled_deletion_at) {
        setIsAccountDeleted(true);
        setDeletionDate(data.scheduled_deletion_at);
      } else {
        setIsAccountDeleted(false);
        setDeletionDate(null);
      }
    };
    checkDeletionStatus();
  }, [user?.uid]);

  // Only refresh user data on first render if stale
  useEffect(() => {
    const lastUserRefresh = localStorage.getItem('last_user_refresh');
    const refreshThreshold = 30 * 60 * 1000;
    const shouldRefresh = !lastUserRefresh || Date.now() - parseInt(lastUserRefresh, 10) > refreshThreshold;

    if (user && shouldRefresh && !isLoading) {
      refreshUserData(true);
      localStorage.setItem('last_user_refresh', Date.now().toString());
    }
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
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error('You must be logged in to delete your account.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'schedule' },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      setIsAccountDeleted(true);
      setDeletionDate(data.scheduled_deletion_at);
      // Clean up old localStorage flag
      localStorage.removeItem('accountDeleted');
      toast.error('Account scheduled for deletion', {
        description: 'Your account will be permanently deleted after 15 days. You can reinstate it before then.',
      });
    } catch (err) {
      console.error('Error scheduling deletion:', err);
      toast.error('Failed to schedule account deletion. Please try again.');
    }
  };

  const handleReinstateAccount = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error('You must be logged in to reinstate your account.');
        return;
      }

      const { error } = await supabase.functions.invoke('delete-account', {
        body: { action: 'reinstate' },
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      setIsAccountDeleted(false);
      setDeletionDate(null);
      localStorage.removeItem('accountDeleted');
      toast.success('Account has been reinstated', {
        description: 'Your account has been successfully reactivated.',
      });
    } catch (err) {
      console.error('Error reinstating account:', err);
      toast.error('Failed to reinstate account. Please try again.');
    }
  };

  return (
    <AppLayout title="" fullWidth={true} className="overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 overflow-hidden">
        <div>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">Manage your account preferences.</p>
        </div>

        <Accordion 
          type="single" 
          value={activeSection} 
          onValueChange={setActiveSection}
          collapsible 
          className="mt-4 sm:mt-6 space-y-4 overflow-hidden"
        >
          <AccordionItem value="profile" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-start gap-3 text-left">
                <User className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-base sm:text-lg">Profile</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">Your personal information</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pt-2 pb-4">
              <ProfileSettings 
                isMobile={isMobile} 
                user={user} 
                isLoading={isLoading} 
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="preferences" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-start gap-3 text-left">
                <SettingsIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-base sm:text-lg">Appearance</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">Theme and display settings</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pt-2 pb-4">
              <AppPreferences 
                colorScheme={colorScheme} 
                onColorSchemeChange={handleColorSchemeChange} 
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="danger" className="border rounded-lg overflow-hidden border-destructive/20">
            <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-start gap-3 text-left">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-destructive" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-base sm:text-lg text-destructive">Danger Zone</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">Account deletion and recovery</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pt-2 pb-4">
              <DangerZone 
                onDeleteAccount={handleDeleteAccount} 
                onReinstateAccount={handleReinstateAccount} 
                isAccountDeleted={isAccountDeleted}
                deletionDate={deletionDate}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </AppLayout>
  );
};

export default Settings;
