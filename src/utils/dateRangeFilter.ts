import { startOfDay, startOfWeek, subDays, parseISO, isAfter } from 'date-fns';
import { NotificationProps } from '@/types/notification';
import { DateRange } from '@/components/notifications/DateRangeFilter';

export const filterNotificationsByDateRange = (
  notifications: NotificationProps[],
  dateRange: DateRange
): NotificationProps[] => {
  if (dateRange === 'all') return notifications;

  const now = new Date();
  let cutoffDate: Date;

  switch (dateRange) {
    case 'today':
      cutoffDate = startOfDay(now);
      break;
    case 'week':
      cutoffDate = startOfWeek(now, { weekStartsOn: 0 });
      break;
    case 'month':
      cutoffDate = subDays(now, 30);
      break;
    default:
      return notifications;
  }

  return notifications.filter(notification => {
    if (!notification.created_at) return true;
    
    const notificationDate = parseISO(notification.created_at);
    return isAfter(notificationDate, cutoffDate) || notificationDate.getTime() === cutoffDate.getTime();
  });
};
