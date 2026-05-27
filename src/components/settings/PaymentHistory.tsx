import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Receipt } from 'lucide-react';

interface PaymentStatusJson {
  approved?: boolean;
  verified?: boolean;
  completed?: boolean;
  cancelled?: boolean;
  voided?: boolean;
  error?: string;
}

interface PaymentRow {
  id: number;
  payment_id: string;
  amount: number;
  memo: string | null;
  txid: string | null;
  status: PaymentStatusJson | null;
  created_at: string | null;
  updated_at: string | null;
}

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

function deriveStateLabel(status: PaymentStatusJson | null): { label: string; variant: Variant } {
  if (!status) return { label: 'Pending', variant: 'secondary' };
  if (status.completed) return { label: 'Completed', variant: 'default' };
  if (status.cancelled) return { label: 'Cancelled', variant: 'destructive' };
  if (status.voided) return { label: 'Voided', variant: 'destructive' };
  if (status.error) return { label: 'Error', variant: 'destructive' };
  if (status.approved) return { label: 'Approved', variant: 'secondary' };
  if (status.verified) return { label: 'Verified', variant: 'secondary' };
  return { label: 'Pending', variant: 'outline' };
}

function formatTime(ts: string | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

const PAGE_SIZE = 10;

const PaymentHistory: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from('payments')
      .select('id, payment_id, amount, memo, txid, status, created_at, updated_at')
      .eq('user_id', user.uid)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (dbError) {
      setError(dbError.message);
      setRows([]);
    } else {
      setRows((data || []) as PaymentRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  if (!user?.uid) {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in to view your payment history.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Showing your {PAGE_SIZE} most recent payments.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-8 px-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="ml-1 text-xs">Refresh</span>
        </Button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Failed to load payments: {error}</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border px-4 py-10 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Receipt className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No transactions yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Your Pi payments to and from businesses will appear here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-md border">
          {rows.map((row) => {
            const state = deriveStateLabel(row.status);
            return (
              <li
                key={row.id}
                className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={state.variant} className="text-[10px] uppercase">
                      {state.label}
                    </Badge>
                    <span className="font-medium tabular-nums">
                      {Number(row.amount).toFixed(4)} π
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.memo || 'Pi payment'}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {row.payment_id}
                    {row.txid ? ` · tx ${row.txid.slice(0, 10)}…` : ''}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs text-muted-foreground">
                    Created {formatTime(row.created_at)}
                  </p>
                  {row.updated_at && row.updated_at !== row.created_at && (
                    <p className="text-xs text-muted-foreground">
                      Updated {formatTime(row.updated_at)}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PaymentHistory;
