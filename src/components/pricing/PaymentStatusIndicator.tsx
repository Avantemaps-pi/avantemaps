
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { forceResolvePendingPayments, canProceedWithPayment } from '@/utils/piPayment/cleanup';

interface PaymentStatusIndicatorProps {
  onStatusResolved?: () => void;
}

export const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({ 
  onStatusResolved 
}) => {
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [canMakePayment, setCanMakePayment] = useState(true);
  const [isResolving, setIsResolving] = useState(false);

  const checkPaymentStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const canProceed = await canProceedWithPayment();
      setCanMakePayment(canProceed);
      
      if (!canProceed) {
        toast.warning('Found pending payments that need to be resolved');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResolveIssues = async () => {
    setIsResolving(true);
    try {
      const resolved = await forceResolvePendingPayments();
      if (resolved) {
        setCanMakePayment(true);
        onStatusResolved?.();
      }
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  if (canMakePayment) {
    return null; // Don't show anything if payments can proceed normally
  }

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-800">Payment Issue Detected</h3>
            <p className="text-sm text-yellow-700 mt-1">
              You have pending payments that need to be resolved before making new payments.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleResolveIssues}
                disabled={isResolving}
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                {isResolving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  'Resolve Issues'
                )}
              </Button>
              <Button
                onClick={checkPaymentStatus}
                disabled={isCheckingStatus}
                size="sm"
                variant="ghost"
                className="text-yellow-700 hover:bg-yellow-100"
              >
                {isCheckingStatus ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Check Again'
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
