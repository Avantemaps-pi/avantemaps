import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PaymentHistory from '@/components/settings/PaymentHistory';

const Wallet = () => {
  return (
    <AppLayout title="Wallet" fullWidth={true} className="overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <PaymentHistory />
      </div>
    </AppLayout>
  );
};

export default Wallet;
