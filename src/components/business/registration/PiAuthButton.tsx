import React from 'react';
import { Button } from '@/components/ui/button';
import { usePiAuth } from '@/hooks/usePiAuth';
import { Loader2 } from 'lucide-react';

export const PiAuthButton = () => {
  const { loginWithPi, loading } = usePiAuth();

  return (
    <Button
      onClick={loginWithPi}
      disabled={loading}
      className="bg-[#5a00cc] hover:bg-[#4a00aa] text-white"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        'Sign in with Pi Network'
      )}
    </Button>
  );
};
