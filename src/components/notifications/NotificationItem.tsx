
import React from 'react';
import { Bell, MessageSquare, Star, Store, Users, ThumbsUp, ShieldCheck, Shield, Coins, Bookmark, AlertCircle } from 'lucide-react';
import { NotificationProps } from '@/types/notification';

interface NotificationItemProps {
  notification: NotificationProps;
  onReadNotification: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onReadNotification }) => {
  const { type, content, time, read, id } = notification;
  
  const getIcon = () => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-5 w-5" />;
      case 'review':
        return <Star className="h-5 w-5" />;
      case 'business':
        return <Store className="h-5 w-5" />;
      case 'follower':
        return <Users className="h-5 w-5" />;
      case 'like':
        return <ThumbsUp className="h-5 w-5" />;
      case 'verification':
        return <ShieldCheck className="h-5 w-5" />;
      case 'certification':
        return <Shield className="h-5 w-5" />;
      case 'payment':
        return <Coins className="h-5 w-5" />;
      case 'bookmark':
        return <Bookmark className="h-5 w-5" />;
      case 'system':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
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
    if (!notification.read) {
      onReadNotification(notification.id);
    }
  };

  return (
    <div 
      className={`p-4 border-b border-border flex items-start ${read ? 'bg-background' : 'bg-accent/30'} cursor-pointer hover:bg-accent/50 transition-colors`}
      onClick={handleClick}
    >
      <div className={`p-2 rounded-full mr-4 ${getIconColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className={`${read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>{content}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
      {!read && (
        <div className="ml-2 h-2 w-2 rounded-full bg-primary"></div>
      )}
    </div>
  );
};

export default NotificationItem;
