import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export interface VerificationMetrics {
  contactInfoConfirmed: boolean;
  totalTransactions: number;
  creditedTransactions: number;
  uniqueWallets: number;
  verified: boolean;
  businessName: string;
  reason?: string | null;
  walletMissing?: boolean;
}

interface CheckItemProps {
  passed: boolean;
  loading: boolean;
  label: string;
  detail?: string;
}

const CheckItem: React.FC<CheckItemProps> = ({ passed, loading, label, detail }) => (
  <div className="flex items-start gap-2 py-1">
    <div className="mt-0.5 flex-shrink-0">
      {loading ? (
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      ) : passed ? (
        <CheckCircle2 size={18} className="text-primary" />
      ) : (
        <XCircle size={18} className="text-destructive" />
      )}
    </div>
    <div className="text-sm min-w-0">
      <span className="font-medium whitespace-nowrap">{label}</span>
      {detail && <p className="text-muted-foreground text-xs whitespace-nowrap">{detail}</p>}
    </div>
  </div>
);

const REVEAL_DELAYS = [300, 900, 1500]; // ms delay for each item

const VerificationResultCard: React.FC<{ metrics: VerificationMetrics }> = ({ metrics }) => {
  const {
    contactInfoConfirmed,
    totalTransactions,
    creditedTransactions,
    uniqueWallets,
    verified,
    businessName,
    walletMissing,
  } = metrics;

  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    const timers = REVEAL_DELAYS.map((delay, i) =>
      setTimeout(() => {
        setRevealed(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const txPassed = totalTransactions >= 100 && creditedTransactions >= 50;
  const walletsPassed = uniqueWallets >= 10;

  const items = walletMissing
    ? [
        {
          passed: contactInfoConfirmed,
          label: 'Contact Information: confirmed',
          detail: undefined,
        },
        {
          passed: false,
          label: 'Pi Wallet: not registered',
          detail: 'Please add a Pi wallet address to your business.',
        },
      ]
    : [
        {
          passed: contactInfoConfirmed,
          label: 'Contact Information: confirmed',
          detail: undefined,
        },
        {
          passed: txPassed,
          label: 'Required Transactions: 100+ (50+ credited)',
          detail: `Current Transactions: ${totalTransactions} total, ${creditedTransactions} credited`,
        },
        {
          passed: walletsPassed,
          label: 'Required Wallets Transacted: 10+',
          detail: `Current Wallets Transacted: ${uniqueWallets}`,
        },
      ];

  return (
    <div className="bg-card border rounded-lg p-4 overflow-hidden">
      <h4 className="font-bold text-lg mb-1">
        {verified ? '✓ Verification Approved' : 'Verification Not Approved'}
      </h4>
      <p className="text-sm text-muted-foreground mb-3">{businessName}</p>

      <div className="space-y-1">
        {items.map((item, i) => (
          <CheckItem
            key={i}
            passed={item.passed}
            loading={!revealed[i]}
            label={item.label}
            detail={item.detail}
          />
        ))}
      </div>
    </div>
  );
};

export default VerificationResultCard;
