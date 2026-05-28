
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { legalItems } from '@/components/layout/sidebar/sidebarConfig';
import AppLayout from '@/components/layout/AppLayout';
import ProfileSettings from '@/components/settings/ProfileSettings';
import AppPreferences from '@/components/settings/AppPreferences';
import DangerZone from '@/components/settings/DangerZone';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { User, Settings as SettingsIcon, AlertTriangle, Scale, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  // Deterministic SSR default: opt-in (true). Real value is hydrated from
  // localStorage after mount to keep server and first client render identical.
  const [useLocation, setUseLocation] = useState<boolean>(true);
  const [useDeviceGps, setUseDeviceGps] = useState<boolean>(false);
  const [gpsConsentOpen, setGpsConsentOpen] = useState(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage?.getItem('use_location_focus');
      if (stored === '0') setUseLocation(false);
      const gps = window.localStorage?.getItem('use_device_gps');
      if (gps === '1') setUseDeviceGps(true);
    } catch {
      // ignore — storage unavailable (private mode, disabled, etc.)
    }
  }, []);

  const handleUseLocationChange = (value: boolean) => {
    let shouldAutoEnableGps = false;
    setUseLocation((prev) => {
      // Re-arm the one-time geolocation prompt when toggling from off → on
      // so the user is asked exactly once after re-enabling the setting.
      if (!prev && value) {
        try { window.localStorage?.removeItem('geolocation_prompted'); } catch { /* ignore */ }
        try {
          if (window.localStorage?.getItem('location_gps_autoenabled') !== '1') {
            shouldAutoEnableGps = true;
          }
        } catch { /* ignore */ }
      }
      return value;
    });
    if (typeof window === 'undefined') return;
    try {
      window.localStorage?.setItem('use_location_focus', value ? '1' : '0');
      window.dispatchEvent(new Event('use_location_focus_changed'));
      if (!value) {
        // Clear cached IP focus so disabling takes immediate effect on next login
        window.sessionStorage?.removeItem('ip_location_focused');
      }
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
    if (shouldAutoEnableGps) {
      try { window.localStorage?.setItem('location_gps_autoenabled', '1'); } catch { /* ignore */ }
      persistGpsPref(true);
    }
  };

  const persistGpsPref = (value: boolean) => {
    setUseDeviceGps((prev) => {
      // Re-arm the one-time browser geolocation prompt when turning Device
      // GPS on from off, so we ask the user again exactly once.
      if (!prev && value) {
        try { window.localStorage?.removeItem('geolocation_prompted'); } catch { /* ignore */ }
      }
      return value;
    });
    try {
      window.localStorage?.setItem('use_device_gps', value ? '1' : '0');
      window.dispatchEvent(new Event('use_device_gps_changed'));
    } catch {
      // ignore
    }
    if (value) {
      toast.success('Device GPS enabled', {
        description: "Tap the locate button on the map — your browser will ask for permission once.",
      });
    } else {
      toast.message('Device GPS disabled', {
        description: 'Falling back to approximate IP-based location.',
      });
    }
  };

  const handleUseDeviceGpsChange = (value: boolean) => {
    if (value) {
      // Require explicit consent before enabling
      setGpsConsentOpen(true);
    } else {
      persistGpsPref(false);
    }
  };
  // Sync the toggle across tabs/windows via the storage event
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ls: Storage | null = null;
    try {
      ls = window.localStorage ?? null;
    } catch {
      ls = null;
    }
    if (!ls) return;

    const handleStorage = (e: StorageEvent) => {
      if (!e || e.key !== 'use_location_focus') return;
      // storageArea may be missing in some environments — only compare when present
      if (e.storageArea && e.storageArea !== ls) return;
      // newValue is null when the key is cleared; treat that as the default (true)
      const next = e.newValue == null ? true : e.newValue !== '0';
      setUseLocation((prev) => (prev === next ? prev : next));
      if (!next) {
        try {
          window.sessionStorage?.removeItem('ip_location_focused');
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
    <AppLayout title="" fullWidth={true} className="overflow-x-hidden" showFooter={false}>
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
                useLocation={useLocation}
                onUseLocationChange={handleUseLocationChange}
                useDeviceGps={useDeviceGps}
                onUseDeviceGpsChange={handleUseDeviceGpsChange}
              />
            </AccordionContent>
          </AccordionItem>

          <div className="mt-6 pt-6 border-t border-border/60">
            <p className="text-xs text-muted-foreground mb-3">Irreversible actions</p>
          </div>

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

          <AccordionItem value="legal" className="border rounded-lg overflow-hidden">
            <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline hover:bg-muted/50">
              <div className="flex items-start gap-3 text-left">
                <Scale className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="font-semibold text-base sm:text-lg">Legal &amp; about</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">Policies and contact</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pt-2 pb-4">
              <div className="space-y-1">
                <Link
                  to="/pricing"
                  className="flex items-center justify-between px-3 py-3 rounded-md hover:bg-muted transition-colors text-sm"
                >
                  <span>Pricing</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                {legalItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center justify-between px-3 py-3 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
                <div className="pt-4 pb-1 text-center">
                  <p className="text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} Avante Maps
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <AlertDialog open={gpsConsentOpen} onOpenChange={setGpsConsentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Use your device's GPS?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Enabling precise location lets Avante Maps center the map on your exact position when you tap the locate button.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your browser will ask for location permission the first time.</li>
                  <li>Coordinates are used only to move the map view on your device.</li>
                  <li>We do <strong>not</strong> store, transmit, or share your GPS coordinates.</li>
                  <li>You can turn this off any time in Settings.</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => persistGpsPref(false)}>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => persistGpsPref(true)}>I agree, enable GPS</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Settings;
