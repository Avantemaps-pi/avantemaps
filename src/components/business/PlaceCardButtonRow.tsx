import React, { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
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
  /** Rendered in the second column next to Message (e.g. a Reviews button in the map drawer) */
  secondaryAction?: React.ReactNode;
}

const buttonBase =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0';
const messageClass = 'bg-primary text-primary-foreground hover:bg-primary-hover';
const linkClass = 'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground';

const PlaceCardButtonRow: React.FC<PlaceCardButtonRowProps> = ({ 
  place, 
  disabled = false, 
  className,
  detailsElement,
  secondaryAction,
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

  if (!canMessage && !hasWebsite && !detailsElement && !secondaryAction) return null;

  const renderMessageButton = (extraClass?: string | false) => (
    <button
      type="button"
      onClick={handleMessage}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className={cn(buttonBase, messageClass, extraClass)}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Messaging…
        </>
      ) : (
        <>
          <MessageCircle />
          Message
        </>
      )}
    </button>
  );

  const renderLinkButton = (extraClass?: string | false) => (
    <button
      type="button"
      onClick={handleWebsite}
      disabled={disabled}
      className={cn(buttonBase, linkClass, extraClass)}
    >
      <ExternalLink />
      Link
    </button>
  );

  if (secondaryAction) {
    return (
      <div
        className={cn(
          'grid gap-2',
          canMessage && hasWebsite
            ? 'grid-cols-[minmax(0,1fr)_auto_auto]'
            : canMessage || hasWebsite
              ? 'grid-cols-[minmax(0,1fr)_auto]'
              : 'grid-cols-1',
          className
        )}
      >
        {canMessage && renderMessageButton('w-full')}
        {hasWebsite && renderLinkButton()}
        {secondaryAction}
      </div>
    );
  }

  if (detailsElement) {
    return (
      <div className={cn('grid grid-cols-2 gap-2 items-end', className)}>
        <div>{canMessage && renderMessageButton('w-full')}</div>
        <div className="flex flex-col items-end gap-1">
          {detailsElement}
          {hasWebsite && renderLinkButton('w-full')}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {canMessage && renderMessageButton(!hasWebsite && 'col-span-2')}
      {hasWebsite && renderLinkButton(!canMessage && 'col-span-2')}
    </div>
  );
};

export default PlaceCardButtonRow;
