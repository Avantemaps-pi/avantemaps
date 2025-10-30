import React from 'react';
import { Button } from '@/components/ui/button';
import { usePiAuth } from '@/hooks/usePiAuth';
import { Loader2 } from 'lucide-react';

export const PiAuthButton = () => {
  const { handlePiAuth, loading } = usePiAuth();

  return (
    <Button
      onClick={handlePiAuth}
      disabled={loading}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all duration-150"
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin w-4 h-4 mr-2" />
          Authenticating with Pi…
        </>
      ) : (
        'Continue with Pi Network'
      )}
    </Button>
  );
};
