import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getAllNotifications, markNotificationAsRead, markAllNotificationsAsRead, notificationUpdateEvent } from '@/utils/notificationUtils';
import NotificationItem from '@/components/notifications/NotificationItem';
import EmptyNotifications from '@/components/notifications/EmptyNotifications';
import NotificationCategoryTabs from '@/components/notifications/NotificationCategoryTabs';
import { NotificationCategory, getNotificationsByCategory, getAllCategoryCounts } from '@/utils/notificationCategories';

const Notifications = () => {
  const [notifications, setNotifications] = useState(getAllNotifications());
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  
  useEffect(() => {
    const updateNotifications = () => {
      setNotifications(getAllNotifications());
    };

    // Update notifications when component mounts
    window.dispatchEvent(notificationUpdateEvent);

    // Listen for notification updates
    window.addEventListener('notificationUpdate', updateNotifications);
    return () => {
      window.removeEventListener('notificationUpdate', updateNotifications);
    };
  }, []);
  
  const markAsRead = (id: string) => {
    markNotificationAsRead(id);
    setNotifications(getAllNotifications());
    window.dispatchEvent(notificationUpdateEvent);
  };
  
  const markAllAsRead = () => {
    markAllNotificationsAsRead();
    setNotifications(getAllNotifications());
    toast.success('All notifications marked as read');
    window.dispatchEvent(notificationUpdateEvent);
  };

  const filteredNotifications = getNotificationsByCategory(notifications, activeCategory);
  const categoryCounts = getAllCategoryCounts(notifications);
  const unreadCount = filteredNotifications.filter(notification => !notification.read).length;
  return (
    <AppLayout title="Avante Maps">
      <div className="max-w-3xl mx-auto mt-6 space-y-6">
        {/* Category Tabs */}
        <div className="px-4">
          <NotificationCategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* Mark all as read button */}
        {notifications.length > 0 && (
          <div className="px-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0}
            >
              Mark all as read
            </Button>
          </div>
        )}
        
        {/* Notifications list */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map(notification => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onReadNotification={markAsRead} 
                  />
                ))
              ) : (
                <EmptyNotifications />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
export default Notifications;