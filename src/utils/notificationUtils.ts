import { NotificationProps, NotificationType, NotificationMetadata } from '@/types/notification';
import { generateNotificationMessage } from './notificationTemplates';

// Initial notifications data - starts empty, populated by real events
let globalNotifications: NotificationProps[] = [];

// Helper function to get unread notification count
export const getUnreadNotificationsCount = (): number => {
  return globalNotifications.filter(notification => !notification.read).length;
};

// Helper function to update a notification's read status
export const markNotificationAsRead = (id: string): void => {
  globalNotifications = globalNotifications.map(notification => 
    notification.id === id ? { ...notification, read: true } : notification
  );
};

// Helper function to mark all notifications as read
export const markAllNotificationsAsRead = (): void => {
  globalNotifications = globalNotifications.map(notification => ({ ...notification, read: true }));
};

// Helper function to mark multiple notifications as read
export const markMultipleNotificationsAsRead = (ids: string[]): void => {
  globalNotifications = globalNotifications.map(notification =>
    ids.includes(notification.id) ? { ...notification, read: true } : notification
  );
};

// Helper function to delete notifications
export const deleteNotifications = (ids: string[]): void => {
  globalNotifications = globalNotifications.filter(notification => !ids.includes(notification.id));
};

// Helper function to get all notifications
export const getAllNotifications = (): NotificationProps[] => {
  return [...globalNotifications];
};

// Helper function to create a new notification
export const createNotification = (
  type: NotificationType,
  metadata: NotificationMetadata = {}
): NotificationProps => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content: generateNotificationMessage(type, metadata),
    time: 'Just now',
    read: false,
    metadata
  };
};

// Helper function to add a notification to the global list
export const addNotification = (notification: NotificationProps): void => {
  globalNotifications = [notification, ...globalNotifications];
  window.dispatchEvent(notificationUpdateEvent);
};

// Custom event for notification updates
export const notificationUpdateEvent = new CustomEvent('notificationUpdate');
