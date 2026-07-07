import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Place } from '@/types/business';
import { useAuth } from '@/context/auth';
import { useMessages } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';

// TEMPORARY: Link button disabled while investigating an issue. Set back to true to re-enable.
const LINK_BUTTON_ENABLED = false;

interface PlaceCardButtonRowProps {
  place: Place;
  disabled?: boolean;
  className?: string;
  detailsElement?: React.ReactNode;
}

const PlaceCardButtonRow: React.FC<PlaceCardButtonRowProps> = ({ 
  place, 
  disabled = false, 
  className,
  detailsElement 
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startConversationWithBusiness } = useMessages(null);
  const [pending, setPending] = useState(false);

  const hasWebsite = LINK_BUTTON_ENABLED && !!place.website && place.website !== '#';
  const businessId = parseInt(place.id, 10);
  const canMessage = !Number.isNaN(businessId);

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || pending || !canMessage) return;
    if (!user?.uid) {
      toast.error('Sign in to message businesses');
      return;
    }
    setPending(true);
    try {
      const convId = await startConversationWithBusiness(businessId);
      if (convId) {
        navigate('/communicon', { state: { openConversationId: convId, chatMode: 'live' } });
      } else {
        toast.error("Couldn't open the conversation. Please try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Failed to start conversation', { description: message });
    } finally {
      setPending(false);
    }
  };

  const handleWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || !hasWebsite) return;
    window.open(place.website, '_blank', 'noopener,noreferrer');
  };

  if (!canMessage && !hasWebsite && !detailsElement) return null;

  const messageButton = canMessage ? (
    <button
      type="button"
      onClick={handleMessage}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-2 min-h-[40px] font-medium disabled:opacity-60 disabled:cursor-not-allowed w-full"
      style={{ fontSize: '12px', fontWeight: 500 }}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
          Messaging…
        </>
      ) : (
        <>
          <MessageCircle style={{ width: 14, height: 14 }} />
          Message
        </>
      )}
    </button>
  ) : null;

  const linkButton = hasWebsite ? (
    <button
      type="button"
      onClick={handleWebsite}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-md bg-transparent border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors py-2 min-h-[40px] font-medium disabled:opacity-60 disabled:cursor-not-allowed w-full"
      style={{ fontSize: '12px', fontWeight: 500 }}
    >
      <ExternalLink style={{ width: 13, height: 13 }} />
      Link
    </button>
  ) : null;

  if (detailsElement) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 items-end', className)}>
        <div>{messageButton}</div>
        <div className="flex flex-col items-end gap-1">
          {detailsElement}
          {linkButton}
        </div>
      </div>
    );
  }

  const messageFull = !hasWebsite;

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {canMessage && (
        <button
          type="button"
          onClick={handleMessage}
          disabled={disabled || pending}
          aria-disabled={disabled || pending}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-2 min-h-[40px] font-medium disabled:opacity-60 disabled:cursor-not-allowed',
            messageFull && 'col-span-2'
          )}
          style={{ fontSize: '12px', fontWeight: 500 }}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
              Messaging…
            </>
          ) : (
            <>
              <MessageCircle style={{ width: 14, height: 14 }} />
              Message
            </>
          )}
        </button>
      )}
      {hasWebsite && (
        <button
          type="button"
          onClick={handleWebsite}
          disabled={disabled}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-md bg-transparent border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors py-2 min-h-[40px] font-medium disabled:opacity-60 disabled:cursor-not-allowed',
            !canMessage && 'col-span-2'
          )}
          style={{ fontSize: '12px', fontWeight: 500 }}
        >
          <ExternalLink style={{ width: 13, height: 13 }} />
          Link
        </button>
      )}
    </div>
  );
};

export default PlaceCardButtonRow;
