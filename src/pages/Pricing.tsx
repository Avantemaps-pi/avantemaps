
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { PricingSection } from '@/components/ui/pricing-section';

import { toast } from 'sonner';
import { TIERS } from '@/components/pricing/pricingTiers';
import { useAuth } from '@/context/auth';
import { useSubscriptionPayment } from '@/components/pricing/useSubscriptionPayment';
import { PaymentOutcomeBanner } from '@/components/pricing/PaymentOutcomeBanner';
import MetaTags from '@/components/seo/MetaTags';

const Pricing = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [previousPlan, setPreviousPlan] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const lastAttemptedTier = useRef<string | null>(null);
  // Get subscription payment utilities
  const {
    userSubscriptionTier,
    selectedFrequency,
    handleFrequencyChange,
    handleSubscribe,
    updateUserSubscription,
    isProcessingPayment,
    isPaymentLocked,
    paymentPolling,
  } = useSubscriptionPayment();
  
  // Handle frequency change
  const handleBillingChange = (frequency: string) => {
    handleFrequencyChange(frequency);
  };

  // Check if user was directed here from another page for subscription upgrade
  useEffect(() => {
    if (location.state && location.state.upgradeNeeded) {
      toast("Premium subscription required for this feature", {
        description: "Please subscribe to a paid plan to access this feature.",
        action: {
          label: "Dismiss",
          onClick: () => console.log("Dismissed"),
        },
      });
    }
    if (location.state?.fromLiveChat || location.state?.focusTier === 'organization') {
      setTimeout(() => {
        document.getElementById('tier-organization')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }
  }, [location.state]);

  // Handle individual plan selection
  const handleIndividualPlanClick = async () => {
    if (userSubscriptionTier && userSubscriptionTier !== 'individual') {
      setPreviousPlan(userSubscriptionTier);
      setShowDialog(true);
    } else if (userSubscriptionTier !== 'individual') {
      // Update the subscription tier and refresh the UI
      await updateUserSubscription('individual');
    }
  };

  // Handle dialog confirmation
  const handleConfirmDowngrade = async () => {
    // Update the subscription tier and refresh the UI
    await updateUserSubscription('individual');
    toast.success('Your subscription has been updated to the Individual plan.');
    setShowDialog(false);
  };

  return (
    <AppLayout title="Pricing">
      <MetaTags
        title="Pricing & Subscriptions"
        description="Choose the perfect subscription plan for your needs. Pay with Pi Network cryptocurrency. Individual, small business, and organization tiers available."
        keywords={['pi network pricing', 'subscription plans', 'pi payment', 'business subscription', 'cryptocurrency pricing']}
        ogType="website"
        ogTitle="Avante Maps Pricing - Pay with Pi"
        ogDescription="Flexible subscription plans powered by Pi Network"
        ogImage={{
          url: `${window.location.origin}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Avante Maps Pricing'
        }}
        twitter={{
          card: 'summary_large_image',
          title: 'Pricing - Avante Maps',
          description: 'Choose your plan and pay with Pi cryptocurrency'
        }}
      />
      <PaymentOutcomeBanner
        isPolling={paymentPolling.isPolling}
        isTerminal={paymentPolling.isTerminal}
        terminalReason={paymentPolling.terminalReason}
        paymentId={paymentPolling.paymentId}
        retryDisabled={isPaymentLocked}
        onRetry={
          lastAttemptedTier.current
            ? () => {
                paymentPolling.reset();
                handleSubscribe(lastAttemptedTier.current!);
              }
            : undefined
        }
        onDismiss={() => paymentPolling.reset()}
      />
      <PricingSection
        title="Simple, transparent pricing"
        subtitle="Choose the plan that's right for you and explore Avante Maps with premium features."
        currentUserTier={userSubscriptionTier}
        tiers={TIERS.map(tier => ({
          ...tier,
          onSubscribe: () => {
            if (tier.id === 'individual') {
              handleIndividualPlanClick();
            } else {
              lastAttemptedTier.current = tier.id;
              handleSubscribe(tier.id);
            }
          },
          isLoading: isProcessingPayment || (paymentPolling.isPolling && !paymentPolling.isTerminal),
          disabled: isPaymentLocked,
        }))}
        frequencies={["monthly", "annually"]}
        organizationTierId={location.state?.focusTier === 'organization' || location.state?.fromLiveChat ? 'organization' : undefined}
        onFrequencyChange={handleBillingChange}
      />
      
      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Plan Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change from your current {previousPlan ? previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1).replace('-', ' ') : ''} plan to the Individual plan? 
              You'll lose access to premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmDowngrade}>Confirm Change</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Pricing;
