import React from 'react';
import { Card } from '@/components/ui/card';
import { usePiPrice } from '@/hooks/usePiPrice';

interface BalanceCardProps {
  balance?: number | null;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance }) => {
  const { piPrice } = usePiPrice();
  const piBalance = typeof balance === 'number' && !Number.isNaN(balance) ? balance : 0;
  const usdEquivalent = piPrice ? piBalance * piPrice : null;

  return (
    <Card className="mb-4 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-0 shadow-md">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <p className="text-xs sm:text-sm font-medium uppercase tracking-wide opacity-90">
          Your Pi balance
        </p>
        <p className="mt-1 text-3xl sm:text-4xl font-semibold tabular-nums">
          {piBalance.toFixed(2)} <span className="text-2xl sm:text-3xl opacity-90">π</span>
        </p>
        <p className="mt-1 text-xs sm:text-sm opacity-75">
          {usdEquivalent !== null ? `≈ $${usdEquivalent.toFixed(2)} USD` : 'USD value unavailable'}
        </p>
      </div>
    </Card>
  );
};

export default BalanceCard;
