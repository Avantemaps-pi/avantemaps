import { useState } from 'react';
import { verifyPiAuthentication } from '@/utils/pi/verifyPiAuthentication';
import { toast } from 'sonner';
import { secureLog } from '@/utils/secureLogger';
import { supabase } from '@/integrations/supabase/client';

export const usePiAuth = () => {
  const [loading, setLoading] = useState(false);

  const handlePiAuth = async () => {
    try {
      setLoading(true);
      secureLog.info('Starting Pi authentication...');

      if (!window.Pi) {
        toast.error('Pi Network SDK not detected. Please open this in the Pi Browser.');
        return;
      }

      await window.Pi.init({ version: '2.0' });

      const scopes = ['username', 'payments'];
      const authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound);

      if (!authResult || !authResult.accessToken || !authResult.user) {
        toast.error('Authentication failed or cancelled. Please try again.');
        return;
      }

      const { accessToken, user } = authResult;
      secureLog.info('Received Pi auth data', { uid: user.uid, username: user.username });

      const verification = await verifyPiAuthentication(accessToken, user.uid, user.username);

      if (verification.verified) {
        toast.success('Pi authentication successful!');
        let { error: signInError } = await supabase.auth.signInWithPassword({
          email: `${user.username}@pi.network`,
          password: user.uid,
        });
        
        if (signInError) {
          // If user doesn’t exist yet, sign them up automatically
          const { error: signUpError } = await supabase.auth.signUp({
            email: `${user.username}@pi.network`,
            password: user.uid,
          });
        
          if (signUpError) {
            toast.error('Unable to create new Pi user');
            console.error(signUpError);
          } else {
            toast.success('Pi account created successfully!');
          }
        }

      } else {
        toast.error(verification.error || 'Verification failed');
        secureLog.error('Verification details:', verification.details);
      }
    } catch (error) {
      secureLog.error('Pi auth failed:', error);
      toast.error('Pi authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onIncompletePaymentFound = (payment: any) => {
    secureLog.info('Incomplete payment found:', payment);
  };

  return { handlePiAuth, loading };
};
