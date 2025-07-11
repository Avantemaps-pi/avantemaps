
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { PricingSection } from '@/components/ui/pricing-section';
import { PaymentStatusIndicator } from '@/components/pricing/PaymentStatusIndicator';
import { toast } from 'sonner';
import { TIERS } from '@/components/pricing/pricingTiers';
import { useAuth } from '@/context/auth';
import { useSubscriptionPayment } from '@/components/pricing/useSubscriptionPayment';

const Pricing = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [previousPlan, setPreviousPlan] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [paymentStatusKey, setPaymentStatusKey] = useState(0);
  
  // Get subscription payment utilities
  const { 
    userSubscriptionTier,
    selectedFrequency, 
    handleFrequencyChange,
    handleSubscribe,
    updateUserSubscription,
    handleCleanupPayments,
    isProcessingPayment 
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

  // Handle payment status resolution
  const handlePaymentStatusResolved = () => {
    setPaymentStatusKey(prev => prev + 1); // Force re-render of payment components
    toast.success('Payment issues resolved. You can now proceed with subscriptions.');
  };
  
  return (
    <AppLayout title="Pricing">
      <PaymentStatusIndicator onStatusResolved={handlePaymentStatusResolved} />
      
      <div className="mb-4 flex flex-col gap-2">
        <Button 
          onClick={handleCleanupPayments}
          variant="outline"
          disabled={isProcessingPayment}
          className="self-start"
        >
          {isProcessingPayment ? "Cleaning up..." : "Fix Payment Issues"}
        </Button>
        <p className="text-sm text-muted-foreground">
          If you're experiencing payment issues or getting "pending payment" errors, click the button above to clean up any pending payments.
        </p>
      </div>
      
      <PricingSection 
        key={paymentStatusKey} // Force re-render when payment status changes
        title="Simple, transparent pricing"
        subtitle="Choose the plan that's right for you and explore Avante Maps with premium features."
        currentUserTier={userSubscriptionTier}
        tiers={TIERS.map(tier => ({
          ...tier,
          onSubscribe: () => {
            if (tier.id === 'individual') {
              handleIndividualPlanClick();
            } else {
              handleSubscribe(tier.id);
            }
          },
          isLoading: isProcessingPayment,
          disabled: false // Remove the comingSoon check to enable all tiers
        }))}
        frequencies={["monthly", "yearly"]}
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
