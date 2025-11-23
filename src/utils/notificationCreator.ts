import { supabase } from '@/integrations/supabase/client';
import { NotificationType, NotificationMetadata, NotificationPriority } from '@/types/notification';
import { renderTemplate } from './templateRenderer';

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  metadata?: NotificationMetadata;
  templateName?: string;
  priority?: NotificationPriority;
}

/**
 * Creates a notification using a template from the database
 * Falls back to generating a default message if template is not found
 */
export const createNotificationFromTemplate = async ({
  userId,
  type,
  metadata = {},
  templateName,
  priority = 'medium',
}: CreateNotificationOptions): Promise<void> => {
  try {
    // Fetch template from database
    const query = supabase
      .from('notification_templates')
      .select('content_template, priority')
      .eq('type', type)
      .eq('is_active', true);
    
    if (templateName) {
      query.eq('name', templateName);
    }
    
    const { data: template, error: templateError } = await query.single();
    
    let content: string;
    let notificationPriority: NotificationPriority;
    
    if (template && !templateError) {
      // Use template
      content = renderTemplate(template.content_template, metadata);
      notificationPriority = template.priority as NotificationPriority || priority;
    } else {
      // Fallback to generating message without template
      const { generateFallbackMessage } = await import('./notificationTemplates');
      content = generateFallbackMessage(type, metadata);
      notificationPriority = priority;
    }
    
    // Create the notification
    const { error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        content,
        metadata: metadata as any,
        priority: notificationPriority,
        read: false,
      }]);
    
    if (error) {
      console.error('Failed to create notification:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error creating notification from template:', error);
    throw error;
  }
};
