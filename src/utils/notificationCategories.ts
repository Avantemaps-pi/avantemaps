import { NotificationProps, NotificationType } from '@/types/notification';

export type NotificationCategory = 'all' | 'comments' | 'system';

export const categoryConfig: Record<NotificationCategory, {
  label: string;
  types: NotificationType[];
}> = {
  all: {
    label: 'All',
    types: ['message', 'review', 'business', 'follower', 'like', 'verification', 'certification', 'payment', 'bookmark', 'system']
  },
  comments: {
    label: 'Comments',
    types: ['message', 'review']
  },
  system: {
    label: 'System',
    types: ['business', 'follower', 'like', 'verification', 'certification', 'payment', 'bookmark', 'system']
  }
};

export const getNotificationsByCategory = (
  notifications: NotificationProps[],
  category: NotificationCategory
): NotificationProps[] => {
  if (category === 'all') return notifications;
  
  const categoryTypes = categoryConfig[category].types;
  return notifications.filter(notification => 
    categoryTypes.includes(notification.type)
  );
};

export const getCategoryUnreadCount = (
  notifications: NotificationProps[],
  category: NotificationCategory
): number => {
  const categoryNotifications = getNotificationsByCategory(notifications, category);
  return categoryNotifications.filter(n => !n.read).length;
};

export const getAllCategoryCounts = (notifications: NotificationProps[]) => {
  return {
    all: notifications.filter(n => !n.read).length,
    comments: getCategoryUnreadCount(notifications, 'comments'),
    system: getCategoryUnreadCount(notifications, 'system')
  };
};
