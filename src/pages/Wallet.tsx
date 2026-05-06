import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaymentHistory from '@/components/settings/PaymentHistory';

const Wallet = () => {
  return (
    <AppLayout title="Wallet" fullWidth={true} className="overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold">Wallet</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Recent Pi payment states and timestamps.
          </p>
        </div>
        <PaymentHistory />
      </div>
    </AppLayout>
  );
};

export default Wallet;
