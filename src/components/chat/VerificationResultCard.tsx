import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  collapsibleContent?: React.ReactNode;
}

const CheckItem: React.FC<CheckItemProps> = ({ passed, loading, label, detail, collapsibleContent }) => {
  const [open, setOpen] = useState(false);
  const hasExpandable = !!detail || !!collapsibleContent;

  return (
    <Collapsible open={open} onOpenChange={setOpen} disabled={!hasExpandable || loading}>
      <div className="flex items-center gap-2 py-1">
        <div className="flex-shrink-0">
          {loading ? (
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          ) : passed ? (
            <CheckCircle2 size={18} className="text-primary" />
          ) : (
            <XCircle size={18} className="text-destructive" />
          )}
        </div>
        <span className="text-sm font-medium flex-1">
          {label.split('\n').map((line, i) => (
            <span key={i} className={i > 0 ? 'block text-xs text-muted-foreground' : ''}>{line}</span>
          ))}
        </span>
        {hasExpandable && !loading && (
          <CollapsibleTrigger asChild>
            <button className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center transition-colors hover:bg-muted/80">
              <ChevronDown
                size={14}
                className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </button>
          </CollapsibleTrigger>
        )}
      </div>
      <CollapsibleContent>
        {detail && (
          <p className="text-muted-foreground text-xs whitespace-nowrap pl-7 pb-1">{detail}</p>
        )}
        {collapsibleContent && (
          <div className="pl-7 pb-2">{collapsibleContent}</div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

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

  const confirmButton = !contactInfoConfirmed ? (
    <button className="text-xs font-semibold px-3 py-1 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors">
      Confirm
    </button>
  ) : undefined;

  const items = walletMissing
    ? [
        {
          passed: contactInfoConfirmed,
          label: `Contact Information: ${contactInfoConfirmed ? 'confirmed' : 'unconfirmed'}`,
          detail: undefined,
          collapsibleContent: confirmButton,
        },
        {
          passed: false,
          label: 'Pi Wallet: not registered',
          detail: 'Please add a Pi wallet address to your business.',
          collapsibleContent: undefined,
        },
      ]
    : [
        {
          passed: contactInfoConfirmed,
          label: `Contact Information: ${contactInfoConfirmed ? 'confirmed' : 'unconfirmed'}`,
          detail: undefined,
          collapsibleContent: confirmButton,
        },
        {
          passed: txPassed,
          label: 'Current Transactions: 100+\n(50+ credited)',
          detail: `Required Transactions: ${totalTransactions} total, ${creditedTransactions} credited`,
          collapsibleContent: undefined,
        },
        {
          passed: walletsPassed,
          label: 'Current Wallets Transacted: 10+',
          detail: `Required Wallets Transacted: ${uniqueWallets}`,
          collapsibleContent: undefined,
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
            collapsibleContent={item.collapsibleContent}
          />
        ))}
      </div>
    </div>
  );
};

export default VerificationResultCard;
