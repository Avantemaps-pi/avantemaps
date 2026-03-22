import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { supabase } from '@/integrations/supabase/client';
import { 
  getAllNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  markMultipleNotificationsAsRead,
  markMultipleNotificationsAsUnread,
  notificationUpdateEvent 
} from '@/utils/notificationUtils';
import { NotificationProps } from '@/types/notification';
import NotificationItem from '@/components/notifications/NotificationItem';
import EmptyNotifications from '@/components/notifications/EmptyNotifications';
import NotificationCategoryTabs from '@/components/notifications/NotificationCategoryTabs';
import BulkActionsBar from '@/components/notifications/BulkActionsBar';
import { NotificationCategory, getNotificationsByCategory, getAllCategoryCounts } from '@/utils/notificationCategories';
import { CheckSquare, RefreshCw } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load initial notifications
  useEffect(() => {
    loadNotifications();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Trigger haptic feedback for new notification
            if ('vibrate' in navigator) {
              navigator.vibrate([50, 100, 50]);
            }

            const newNotification: NotificationProps = {
              id: payload.new.id,
              type: payload.new.type,
              content: payload.new.content,
              time: 'Just now',
              read: payload.new.read,
              metadata: payload.new.metadata,
              priority: payload.new.priority || 'medium'
            };

            // Add to new notification IDs for animation
            setNewNotificationIds(prev => new Set([...prev, newNotification.id]));
            
            // Remove from animation set after 2 seconds
            setTimeout(() => {
              setNewNotificationIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(newNotification.id);
                return newSet;
              });
            }, 2000);

            setNotifications(prev => [newNotification, ...prev]);
            window.dispatchEvent(notificationUpdateEvent);
            toast.success('New notification received');
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const loadNotifications = async () => {
    const data = await getAllNotifications();
    setNotifications(data);
  };
  
  const markAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    await loadNotifications();
    window.dispatchEvent(notificationUpdateEvent);
  };
  
  const markAllAsRead = async () => {
    await markAllNotificationsAsRead();
    await loadNotifications();
    toast.success('All notifications marked as read');
    window.dispatchEvent(notificationUpdateEvent);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkMarkAsRead = async () => {
    const idsArray = Array.from(selectedIds);
    await markMultipleNotificationsAsRead(idsArray);
    await loadNotifications();
    toast.success(`${idsArray.length} notifications marked as read`);
    setSelectedIds(new Set());
    setSelectionMode(false);
    window.dispatchEvent(notificationUpdateEvent);
  };

  const handleBulkMarkAsUnread = async () => {
    const idsArray = Array.from(selectedIds);
    await markMultipleNotificationsAsUnread(idsArray);
    await loadNotifications();
    toast.success(`${idsArray.length} notifications marked as unread`);
    setSelectedIds(new Set());
    setSelectionMode(false);
    window.dispatchEvent(notificationUpdateEvent);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleRefresh = async () => {
    // Trigger haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    await loadNotifications();
    window.dispatchEvent(notificationUpdateEvent);
    toast.success('Notifications refreshed');
  };

  const filteredNotifications = getNotificationsByCategory(notifications, activeCategory);
  const categoryCounts = getAllCategoryCounts(notifications);
  const unreadCount = filteredNotifications.filter(notification => !notification.read).length;
  return (
    <AppLayout title="Avante Maps">
      <div className="max-w-3xl mx-auto mt-2 space-y-2">
        {/* Category Tabs */}
        <div className="px-3">
          <NotificationCategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            categoryCounts={categoryCounts}
          />
        </div>

        
        {/* Notifications list with pull-to-refresh */}
        <PullToRefresh
          onRefresh={handleRefresh}
          pullingContent={
            <div className="flex justify-center py-4">
              <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
            </div>
          }
          refreshingContent={
            <div className="flex justify-center py-4">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            </div>
          }
          pullDownThreshold={80}
          maxPullDownDistance={100}
          resistance={2}
        >
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={newNotificationIds.has(notification.id) ? 'animate-fade-in' : ''}
                    >
                      <NotificationItem 
                        notification={notification} 
                        onReadNotification={markAsRead}
                        isSelected={selectedIds.has(notification.id)}
                        onToggleSelection={toggleSelection}
                        selectionMode={selectionMode}
                      />
                    </div>
                  ))
                ) : (
                  <EmptyNotifications />
                )}
              </div>
            </CardContent>
          </Card>
        </PullToRefresh>

        {/* Bulk actions bar */}
        {selectionMode && selectedIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onMarkAsRead={handleBulkMarkAsRead}
            onMarkAsUnread={handleBulkMarkAsUnread}
            onClearSelection={handleClearSelection}
          />
        )}
      </div>
    </AppLayout>
  );
};
export default Notifications;