
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
import Index from "./pages/Index";
import { initializePiNetwork } from "./utils/piNetwork";
import { prefetchHighPriorityRoutes } from "@/lib/routePrefetch";

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
const NotificationAdmin = lazy(() => import("./pages/NotificationAdmin"));

// Cache query results across route navigations so revisiting a page
// renders instantly from cache instead of refetching every time.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 min — data considered fresh between nav
      gcTime: 5 * 60 * 1000, // 5 min — keep in memory after unmount
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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

  // Warm the route cache for likely-next pages during idle time so
  // the first navigation away from the landing/map page feels instant.
  useEffect(() => {
    prefetchHighPriorityRoutes();
  }, []);


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
                      <Route path="/notification-admin" element={<NotificationAdmin />} />
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
