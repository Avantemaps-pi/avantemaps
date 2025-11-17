import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  getAllNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  markMultipleNotificationsAsRead,
  deleteNotifications,
  notificationUpdateEvent 
} from '@/utils/notificationUtils';
import NotificationItem from '@/components/notifications/NotificationItem';
import EmptyNotifications from '@/components/notifications/EmptyNotifications';
import NotificationCategoryTabs from '@/components/notifications/NotificationCategoryTabs';
import BulkActionsBar from '@/components/notifications/BulkActionsBar';
import { NotificationCategory, getNotificationsByCategory, getAllCategoryCounts } from '@/utils/notificationCategories';
import { CheckSquare } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState(getAllNotifications());
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
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

  const handleBulkMarkAsRead = () => {
    const idsArray = Array.from(selectedIds);
    markMultipleNotificationsAsRead(idsArray);
    setNotifications(getAllNotifications());
    toast.success(`${idsArray.length} notifications marked as read`);
    setSelectedIds(new Set());
    setSelectionMode(false);
    window.dispatchEvent(notificationUpdateEvent);
  };

  const handleBulkDelete = () => {
    const idsArray = Array.from(selectedIds);
    deleteNotifications(idsArray);
    setNotifications(getAllNotifications());
    toast.success(`${idsArray.length} notifications deleted`);
    setSelectedIds(new Set());
    setSelectionMode(false);
    window.dispatchEvent(notificationUpdateEvent);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
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

        {/* Action buttons */}
        {notifications.length > 0 && (
          <div className="px-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0}
            >
              Mark all as read
            </Button>
            
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
              className="gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              {selectionMode ? 'Cancel selection' : 'Select'}
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
                    isSelected={selectedIds.has(notification.id)}
                    onToggleSelection={toggleSelection}
                    selectionMode={selectionMode}
                  />
                ))
              ) : (
                <EmptyNotifications />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk actions bar */}
        {selectionMode && selectedIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onMarkAsRead={handleBulkMarkAsRead}
            onDelete={handleBulkDelete}
            onClearSelection={handleClearSelection}
          />
        )}
      </div>
    </AppLayout>
  );
};
export default Notifications;