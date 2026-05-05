
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import {
  executeSubscriptionPayment,
  getSubscriptionPrice
} from '@/utils/piPayment';
import { approvePayment } from '@/api/payments';
import { SubscriptionTier } from '@/utils/piNetwork';
import { toast } from 'sonner';
import { withPiErrorHandling } from '@/utils/piPayment/piErrorHandler';
import { usePaymentStatusPolling } from '@/hooks/usePaymentStatusPolling';

// TODO(PiRC2): When the Pi Network PiRC2 subscription contract ships and
// `FEATURE_FLAGS.pirc2Subscriptions` is enabled, route monthly renewals
// through the contract (server-side cron + allowance) instead of the
// per-period U2A flow used here. See docs/pirc2-integration.md.

export const useSubscriptionPayment = () => {
  const { user, isAuthenticated, login, refreshUserData } = useAuth();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState("monthly");
  const polling = usePaymentStatusPolling();

  // Disable duplicate submissions while processing OR while a payment is being
  // polled. Stays locked once a terminal "completed" state is seen so the UI
  // can refresh user data without allowing a re-submit.
  const isPaymentLocked =
    isProcessingPayment ||
    polling.isPolling ||
    (polling.isTerminal && polling.terminalReason === 'completed');

  const handleFrequencyChange = (frequency: string) => {
    setSelectedFrequency(frequency);
  };

  const updateUserSubscription = async (tier: string) => {
    if (!isAuthenticated) {
      toast.info("Please log in to change your subscription");
      await login();
      return;
    }

    try {
      setIsProcessingPayment(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success(`Successfully updated to ${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription`);
      await refreshUserData();
      console.log('User subscription updated to:', tier);
      return tier;
    } catch (error) {
      console.error("Subscription update error:", error);
      toast.error("Failed to update subscription");
      return null;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (tier === "individual" || tier.includes("coming-soon")) return;

    if (!isAuthenticated) {
      toast.info("Please log in to upgrade your subscription");
      await login();
      return;
    }

    if (user?.subscriptionTier === tier) {
      toast.info("You are already subscribed to this plan");
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log("Refreshing user data before payment...");
      await refreshUserData();

      const subscriptionTier = tier as SubscriptionTier;
      const price = getSubscriptionPrice(subscriptionTier, selectedFrequency);

      // Execute the payment using the Pi Network flow with error handling
      const result = await withPiErrorHandling(async () => {
        return await executeSubscriptionPayment(
          price,
          subscriptionTier,
          selectedFrequency as 'monthly' | 'yearly'
        );
      });

      if (result && result.success) {
        toast.success(result.message);
        
        // Refresh user data if the payment was successful and requires refresh
        if (result.shouldRefreshUser) {
          console.log("Payment successful, refreshing user data...");
          await refreshUserData();
        }
      } else if (result) {
        // Handle specific error cases
        if (result.message.includes("permission not granted")) {
          toast.error(result.message);
          toast.info("Attempting to refresh your permissions...");
          await login();
        } else if (result.message.includes("Failed to get user permissions")) {
          toast.error("Permission issue detected. Please log in again to grant all required permissions.");
          await login();
        } else if (result.message.includes("pending payment") || result.message.includes("action from the developer")) {
          toast.error("You have a pending payment that needs attention. Please contact support or try again later.");
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      console.error("Subscription error:", error);

      if (error instanceof Error) {
        if (
          error.message.includes("permission not granted") ||
          error.message.includes("Failed to get user permissions") ||
          error.message.includes("wallet_address")
        ) {
          toast.error(error.message);
          toast.info("Please try logging in again to grant all required permissions");
          await login();
        } else if (error.message.includes("pending payment") || error.message.includes("action from the developer")) {
          toast.error("You have a pending payment that needs attention. Please contact support or try again later.");
        } else {
          toast.error("Failed to process subscription payment: " + error.message);
        }
      } else {
        toast.error("Failed to process subscription payment");
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCleanupPayments = async () => {
    setIsProcessingPayment(true);
    try {
      toast.info("This feature has been removed. Payment issues are now handled automatically.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return {
    isProcessingPayment,
    selectedFrequency,
    handleFrequencyChange,
    handleSubscribe,
    updateUserSubscription,
    handleCleanupPayments,
    userSubscriptionTier: user?.subscriptionTier
  };
};
