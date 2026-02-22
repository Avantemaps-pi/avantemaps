import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import ContactOTPVerification from './ContactOTPVerification';

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

const REVEAL_DELAYS = [300, 900, 1500];

interface VerificationResultCardProps {
  metrics: VerificationMetrics;
  contactEmail?: string;
  contactBusinessId?: number;
  onSendContactOTP?: (email: string) => Promise<boolean>;
  onVerifyContactOTP?: (email: string, otp: string, businessId: number) => Promise<boolean>;
  animate?: boolean;
}

const VerificationResultCard: React.FC<VerificationResultCardProps> = ({
  metrics,
  contactEmail,
  contactBusinessId,
  onSendContactOTP,
  onVerifyContactOTP,
  animate = true,
}) => {
  const {
    contactInfoConfirmed: initialContactInfoConfirmed,
    totalTransactions,
    creditedTransactions,
    uniqueWallets,
    verified,
    businessName,
    walletMissing,
  } = metrics;

  const [contactInfoConfirmed, setContactInfoConfirmed] = useState(initialContactInfoConfirmed);
  const [revealed, setRevealed] = useState<boolean[]>(animate ? [false, false, false] : [true, true, true]);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

  const handleVerified = () => {
    setContactInfoConfirmed(true);
    setOtpDialogOpen(false);
  };

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

  const canShowOTP = !contactInfoConfirmed && contactEmail && contactBusinessId && onSendContactOTP && onVerifyContactOTP;

  const confirmButton = canShowOTP ? (
    <button
      onClick={() => setOtpDialogOpen(true)}
      className="text-xs font-semibold px-3 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
    >
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
          label: `Current Transactions: ${totalTransactions}\n(${creditedTransactions} credited)`,
          detail: `Required Transactions: 100+ total, 50+ credited`,
          collapsibleContent: undefined,
        },
        {
          passed: walletsPassed,
          label: `Current Wallets Transacted: ${uniqueWallets}`,
          detail: `Required Wallets Transacted: 10+`,
          collapsibleContent: undefined,
        },
      ];

  return (
    <>
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

      {canShowOTP && (
        <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle className="sr-only">Verify Contact Information</DialogTitle>
            <ContactOTPVerification
              email={contactEmail}
              businessId={contactBusinessId}
              onSendOTP={onSendContactOTP}
              onVerifyOTP={onVerifyContactOTP}
              onVerified={handleVerified}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default VerificationResultCard;
