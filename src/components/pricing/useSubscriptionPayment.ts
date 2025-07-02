
import { useState } from 'react';
import { useAuth } from '@/context/auth';
import {
  executeSubscriptionPayment,
  getSubscriptionPrice
} from '@/utils/piPayment';
import { approvePayment } from '@/api/payments';
import { SubscriptionTier } from '@/utils/piNetwork';
import { toast } from 'sonner';

export const useSubscriptionPayment = () => {
  const { user, isAuthenticated, login, refreshUserData } = useAuth();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState("monthly");

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

      const result = await executeSubscriptionPayment(
        price,
        subscriptionTier,
        selectedFrequency as 'monthly' | 'yearly'
      );

      if (result.success) {
        toast.success(result.message);

        // Use the transaction ID from the result if available
        if (result.transactionId) {
          const approvalResult = await approvePayment({
            paymentId: result.transactionId,
            userId: user?.uid!,
            amount: price,
            memo: `${subscriptionTier}_${selectedFrequency}`,
            metadata: {
              subscriptionTier,
              duration: selectedFrequency === 'yearly' ? 365 : 30
            }
          });

          if (approvalResult.success) {
            toast.success("Subscription activated successfully");
            await refreshUserData();
          } else {
            toast.error("Payment approved, but subscription update failed");
            console.error("Approval failed:", approvalResult.message);
          }
        }

      } else {
        if (result.message.includes("permission not granted")) {
          toast.error(result.message);
          toast.info("Attempting to refresh your permissions...");
          await login();
        } else if (result.message.includes("Failed to get user permissions")) {
          toast.error("Permission issue detected. Please log in again to grant all required permissions.");
          await login();
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

  return {
    isProcessingPayment,
    selectedFrequency,
    handleFrequencyChange,
    handleSubscribe,
    updateUserSubscription,
    userSubscriptionTier: user?.subscriptionTier
  };
};
