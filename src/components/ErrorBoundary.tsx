import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error) {
    console.error("App crashed:", error);
    // Log to server via edge function
    supabase.functions.invoke('log-error', {
      body: {
        message: error.message,
        stack_trace: error.stack,
        user_agent: navigator.userAgent,
      },
    }).catch(() => {
      // Silently fail - don't crash the error boundary
    });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex flex-col justify-center items-center bg-purple-700 text-white">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2">{this.state.error?.message}</p>
          <button
            className="mt-4 px-4 py-2 bg-white text-purple-700 rounded"
            onClick={() => window.location.reload()}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
