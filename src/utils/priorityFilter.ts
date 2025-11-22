import { NotificationProps } from '@/types/notification';
import { PriorityFilterValue } from '@/components/notifications/PriorityFilter';

export const filterNotificationsByPriority = (
  notifications: NotificationProps[],
  priority: PriorityFilterValue
): NotificationProps[] => {
  if (priority === 'all') return notifications;
  
  return notifications.filter(notification => notification.priority === priority);
};
