import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import type { TerminalReason } from '@/hooks/usePaymentStatusPolling';

interface PaymentOutcomeBannerProps {
  isPolling: boolean;
  isTerminal: boolean;
  terminalReason: TerminalReason | null;
  paymentId: string | null;
  /** Called when the user opts to retry. Only shown when retry is safe. */
  onRetry?: () => void;
  /** Called when the user dismisses the banner. */
  onDismiss?: () => void;
  /** Disable retry while another action is in flight. */
  retryDisabled?: boolean;
}

interface OutcomeMeta {
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'destructive' | 'info';
  Icon: React.ComponentType<{ className?: string }>;
  /** Whether retrying is appropriate without risking a double charge. */
  canRetry: boolean;
}

const OUTCOMES: Record<TerminalReason, OutcomeMeta> = {
  completed: {
    title: 'Payment completed',
    description:
      'Your payment was confirmed on the Pi network and your subscription is active.',
    tone: 'success',
    Icon: CheckCircle2,
    canRetry: false,
  },
  cancelled: {
    title: 'Payment cancelled',
    description:
      'The payment was cancelled before any Pi was transferred. You can safely try again.',
    tone: 'warning',
    Icon: XCircle,
    canRetry: true,
  },
  voided: {
    title: 'Payment voided',
    description:
      'The payment expired without completing. No Pi was transferred. You can safely try again.',
    tone: 'warning',
    Icon: AlertTriangle,
    canRetry: true,
  },
  error: {
    title: 'Payment failed',
    description:
      'Something went wrong while finalizing the payment. If your wallet was not charged, you can try again.',
    tone: 'destructive',
    Icon: XCircle,
    canRetry: true,
  },
  timeout: {
    title: 'Status check timed out',
    description:
      'We could not confirm the final state in time. Please check your Pi wallet before retrying — do not retry if you see a successful transfer.',
    tone: 'destructive',
    Icon: Clock,
    canRetry: false,
  },
};

const toneClasses: Record<OutcomeMeta['tone'], string> = {
  success: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  destructive: 'border-destructive/30 bg-destructive/5',
  info: 'border-primary/30 bg-primary/5',
};

const iconToneClasses: Record<OutcomeMeta['tone'], string> = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  destructive: 'text-destructive',
  info: 'text-primary',
};

export const PaymentOutcomeBanner: React.FC<PaymentOutcomeBannerProps> = ({
  isPolling,
  isTerminal,
  terminalReason,
  paymentId,
  onRetry,
  onDismiss,
  retryDisabled,
}) => {
  // Active polling state — show a non-dismissible "in progress" indicator.
  if (isPolling && !isTerminal) {
    return (
      <Card className="mb-4 border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />
          <div className="flex-1">
            <h3 className="text-sm font-medium">Confirming payment…</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Waiting for the Pi network to finalize this payment. Please don't
              start a new one yet.
            </p>
            {paymentId && (
              <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {paymentId}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isTerminal || !terminalReason) return null;

  const meta = OUTCOMES[terminalReason];
  const { Icon } = meta;

  return (
    <Card className={`mb-4 ${toneClasses[meta.tone]}`}>
      <CardContent className="flex items-start gap-3 p-4">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconToneClasses[meta.tone]}`} />
        <div className="flex-1">
          <h3 className="text-sm font-medium">{meta.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
          {paymentId && (
            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {paymentId}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {meta.canRetry && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                disabled={retryDisabled}
              >
                Try again
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentOutcomeBanner;
