import React, { useState, useRef } from 'react';
import { Bell, MessageSquare, Star, Store, Users, ThumbsUp, ShieldCheck, Shield, Coins, Bookmark, AlertCircle, Check } from 'lucide-react';
import { NotificationProps } from '@/types/notification';
import { Checkbox } from '@/components/ui/checkbox';
import { useSwipeable } from 'react-swipeable';
import { cn } from '@/lib/utils';
import PriorityIndicator from './PriorityIndicator';

interface NotificationItemProps {
  notification: NotificationProps;
  onReadNotification: (id: string) => void;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  selectionMode?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onReadNotification,
  isSelected = false,
  onToggleSelection,
  selectionMode = false
}) => {
  const { type, content, time, read, id } = notification;
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const hasVibratedRef = useRef(false);

  const SWIPE_THRESHOLD = 80;

  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator && !hasVibratedRef.current) {
      navigator.vibrate(50); // 50ms vibration
      hasVibratedRef.current = true;
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'review':
        return <Star className="h-4 w-4" />;
      case 'business':
        return <Store className="h-4 w-4" />;
      case 'follower':
        return <Users className="h-4 w-4" />;
      case 'like':
        return <ThumbsUp className="h-4 w-4" />;
      case 'verification':
        return <ShieldCheck className="h-4 w-4" />;
      case 'certification':
        return <Shield className="h-4 w-4" />;
      case 'payment':
        return <Coins className="h-4 w-4" />;
      case 'bookmark':
        return <Bookmark className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'message':
        return 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50';
      case 'review':
        return 'text-yellow-500 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/50';
      case 'business':
        return 'text-green-500 bg-green-50 dark:text-green-400 dark:bg-green-950/50';
      case 'follower':
        return 'text-purple-500 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/50';
      case 'like':
        return 'text-pink-500 bg-pink-50 dark:text-pink-400 dark:bg-pink-950/50';
      case 'verification':
        return 'text-emerald-500 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50';
      case 'certification':
        return 'text-indigo-500 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/50';
      case 'payment':
        return 'text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50';
      case 'bookmark':
        return 'text-cyan-500 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/50';
      case 'system':
        return 'text-slate-500 bg-slate-50 dark:text-slate-400 dark:bg-slate-950/50';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const handleClick = () => {
    if (isSwiping) return;
    
    if (selectionMode && onToggleSelection) {
      onToggleSelection(notification.id);
    } else if (!notification.read) {
      onReadNotification(notification.id);
    }
  };

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(notification.id);
    }
  };

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (selectionMode) return;
      setIsSwiping(true);
      
      // Only allow right swipe (positive deltaX) for mark as read
      const offset = Math.max(0, Math.min(120, eventData.deltaX));
      setSwipeOffset(offset);

      // Trigger haptic feedback when crossing threshold
      if (offset > SWIPE_THRESHOLD && !read) {
        triggerHapticFeedback();
      }
    },
    onSwiped: (eventData) => {
      if (selectionMode) {
        setSwipeOffset(0);
        setIsSwiping(false);
        hasVibratedRef.current = false;
        return;
      }

      // Swipe right - mark as read
      if (eventData.deltaX > SWIPE_THRESHOLD && !read) {
        onReadNotification(notification.id);
      }
      
      // Reset
      setTimeout(() => {
        setSwipeOffset(0);
        setIsSwiping(false);
        hasVibratedRef.current = false;
      }, 100);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const showMarkAsReadAction = swipeOffset > SWIPE_THRESHOLD && !read;

  return (
    <div 
      className={cn(
        "relative overflow-hidden border-b border-border",
        isSelected && "bg-accent/60"
      )}
    >
      {/* Left action - Mark as read */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center bg-emerald-500 transition-opacity",
          showMarkAsReadAction ? "opacity-100" : "opacity-0"
        )}
      >
        <Check className="h-6 w-6 text-white" />
      </div>

      {/* Main content */}
      <div
        {...handlers}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out'
        }}
        className={cn(
          "p-3 flex items-start cursor-pointer hover:bg-accent/50 transition-colors bg-background",
          read ? "" : "bg-accent/30"
        )}
        onClick={handleClick}
      >
        {selectionMode && (
          <div className="mr-3 mt-1" onClick={handleCheckboxChange}>
            <Checkbox checked={isSelected} />
          </div>
        )}
        
      <div className={`p-1.5 rounded-full mr-3 ${getIconColor()}`}>
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm ${read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>{content}</p>
            <PriorityIndicator priority={notification.priority} variant="dot" />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{time}</p>
        </div>
        
        {!read && !selectionMode && (
          <div className="ml-2 h-2 w-2 rounded-full bg-primary"></div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
