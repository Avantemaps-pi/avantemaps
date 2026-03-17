
import React, { useEffect, useState, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/context/auth";
import { useSessionRestoration } from "@/hooks/useSessionRestoration";
import { SessionManager } from "@/components/session/SessionManager";
import AuthenticatingOverlay from "@/components/auth/AuthenticatingOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import 'leaflet/dist/leaflet.css';
import Index from "./pages/Index";
import { initializePiNetwork } from "./utils/piNetwork";

// Lazy-loaded pages for code splitting
const Recommendations = lazy(() => import("./pages/Recommendations"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Settings = lazy(() => import("./pages/Settings"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const Registration = lazy(() => import("./pages/Registration"));
const UpdateRegistration = lazy(() => import("./pages/UpdateRegistration"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Communicon = lazy(() => import("./pages/Communicon"));
const Notifications = lazy(() => import("./pages/Notifications"));
const RegisteredBusiness = lazy(() => import("./pages/RegisteredBusiness"));
const VerificationInfo = lazy(() => import("./pages/VerificationInfo"));
const Review = lazy(() => import("./pages/Review"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Analytics = lazy(() => import("./pages/Analytics"));
const NotificationTemplates = lazy(() => import("./pages/NotificationTemplates"));
const BulkNotifications = lazy(() => import("./pages/BulkNotifications"));
const CronSetup = lazy(() => import("./pages/CronSetup"));
const ABTestingDashboard = lazy(() => import("./pages/ABTestingDashboard"));
const FrequencyCaps = lazy(() => import("./pages/FrequencyCaps"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex flex-col min-h-screen bg-background">
    {/* Header skeleton */}
    <div className="h-14 border-b border-border px-4 flex items-center gap-3">
      <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
    </div>
    {/* Content skeleton */}
    <div className="flex-1 p-4 space-y-4">
      <div className="h-5 w-48 rounded bg-muted animate-pulse" />
      <div className="space-y-3">
        <div className="h-40 w-full rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-3 pt-2">
        <div className="h-40 w-full rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  </div>
);

/**
 * SessionRestoration handles visibility/network changes.
 * SessionManager handles centralized Supabase auth error detection.
 */
const SessionRestoration = () => {
  useSessionRestoration();
  return null;
};

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Quick loading screen - just enough for initial render
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const initPiSdk = async () => {
      if (typeof window === "undefined") return;
      if (window.Pi) {
        console.log("✅ Pi SDK already loaded.");
        return;
      }
  
      try {
        console.log("📦 Loading Pi SDK...");
        await initializePiNetwork();
        console.log("✅ Pi SDK initialized successfully");
      } catch (err) {
        console.error("❌ Failed to initialize Pi SDK:", err);
      }
    };
  
    // Wait until DOM is ready
    if (document.readyState === "complete") {
      initPiSdk();
    } else {
      window.addEventListener("load", initPiSdk);
      return () => window.removeEventListener("load", initPiSdk);
    }
  }, []);

  useEffect(() => {
    const savedScheme = localStorage.getItem('colorScheme');
    if (savedScheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
      localStorage.setItem('colorScheme', 'light');
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#8000ff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}>
        <img
          src="/lovable-uploads/Avante Maps ICON (2).png"
          alt="Loading..."
          style={{
            width: '150px',
            height: '150px',
            animation: 'pulse 2s infinite ease-in-out',
          }}
        />
        <p style={{ color: 'white', fontSize: '1.2rem', marginTop: '20px' }}>
          Avante Maps...
        </p>
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.9; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BrowserRouter>
          <TooltipProvider>
            <ErrorBoundary>
              <AuthProvider>
                <AuthenticatingOverlay />
                <SidebarProvider>
                  <SessionRestoration />
                  <SessionManager />
                  <Toaster />
                  <Sonner />
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/recommendations" element={<Recommendations />} />
                      <Route path="/recommendations/:placeId" element={<Recommendations />} />
                      <Route path="/bookmarks" element={<Bookmarks />} />
                      <Route path="/communicon" element={<Communicon />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/registered-business" element={<RegisteredBusiness />} />
                      <Route path="/verification-info" element={<VerificationInfo />} />
                      <Route path="/review/:businessId?" element={<Review />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/cookies" element={<CookiePolicy />} />
                      <Route path="/registration" element={<Registration />} />
                      <Route path="/update-registration/:businessId?" element={<UpdateRegistration />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/notification-templates" element={<NotificationTemplates />} />
                      <Route path="/bulk-notifications" element={<BulkNotifications />} />
                      <Route path="/cron-setup" element={<CronSetup />} />
                      <Route path="/ab-testing" element={<ABTestingDashboard />} />
                      <Route path="/frequency-caps" element={<FrequencyCaps />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </SidebarProvider>
              </AuthProvider>
            </ErrorBoundary>
          </TooltipProvider>
        </BrowserRouter>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
