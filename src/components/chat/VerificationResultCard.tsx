import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

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
  loading?: boolean;
  label: string;
  detail?: string;
}

const CheckItem: React.FC<CheckItemProps> = ({ passed, loading, label, detail }) => (
  <div className="flex items-start gap-2 py-1">
    <div className="mt-0.5 flex-shrink-0">
      {loading ? (
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      ) : passed ? (
        <CheckCircle2 size={18} className="text-green-600" />
      ) : (
        <Circle size={18} className="text-muted-foreground" />
      )}
    </div>
    <div className="text-sm">
      <span className="font-medium">{label}</span>
      {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
    </div>
  </div>
);

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

  const txPassed = totalTransactions >= 100 && creditedTransactions >= 50;
  const walletsPassed = uniqueWallets >= 10;

  return (
    <div className="bg-card border rounded-lg p-4 max-w-sm">
      <h4 className="font-bold text-lg mb-3">
        {verified ? '✓ Verification Approved' : 'Verification Not Approved'}
      </h4>
      <p className="text-sm text-muted-foreground mb-3">{businessName}</p>

      <div className="space-y-1">
        <CheckItem
          passed={contactInfoConfirmed}
          label="Contact Information: confirmed"
        />

        {walletMissing ? (
          <CheckItem
            passed={false}
            label="Pi Wallet: not registered"
            detail="Please add a Pi wallet address to your business."
          />
        ) : (
          <>
            <CheckItem
              passed={txPassed}
              label={`Required Transactions: 100+ (50+ credited)`}
              detail={`Current Transactions: ${totalTransactions} total, ${creditedTransactions} credited`}
            />
            <CheckItem
              passed={walletsPassed}
              label="Required Wallets Transacted: 10+"
              detail={`Current Wallets Transacted: ${uniqueWallets}`}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default VerificationResultCard;
