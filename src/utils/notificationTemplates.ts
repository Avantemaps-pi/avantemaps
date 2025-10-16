import { NotificationType, NotificationMetadata } from '@/types/notification';

export const generateNotificationMessage = (
  type: NotificationType,
  metadata: NotificationMetadata = {}
): string => {
  const {
    businessName = 'your business',
    userName = 'A user',
    rating,
    status,
    amount,
    viewCount,
    tier,
    date,
    featureName,
    count = 1
  } = metadata;

  switch (type) {
    case 'message':
      return count > 1
        ? `You have ${count} new messages from ${userName}`
        : `${userName} sent you a message`;

    case 'review':
      if (rating) {
        return `${userName} left a ${rating}-star review on "${businessName}"`;
      }
      return `${userName} reviewed your business "${businessName}"`;

    case 'business':
      if (viewCount) {
        return `Your business profile for "${businessName}" has been viewed ${viewCount} times this week`;
      }
      if (status === 'approved') {
        return `Your business "${businessName}" has been listed successfully`;
      }
      return `"${businessName}" is now live on Avante Maps`;

    case 'verification':
      switch (status) {
        case 'pending':
          return `Your verification request for "${businessName}" is being reviewed`;
        case 'verified':
          return `Congratulations! "${businessName}" has been verified ✓`;
        case 'rejected':
          return `Your verification request for "${businessName}" was not approved. Check requirements.`;
        default:
          return `Your verification request for "${businessName}" requires additional information`;
      }

    case 'certification':
      switch (status) {
        case 'pending':
          return `Your certification request for "${businessName}" is under review`;
        case 'certified':
          return `Congratulations! "${businessName}" has been certified 🛡️`;
        case 'rejected':
          return `Your certification request for "${businessName}" was declined. Review criteria.`;
        default:
          return `Your certification request for "${businessName}" needs more documentation`;
      }

    case 'payment':
      if (status === 'rejected') {
        return 'Payment failed: Please update your payment method';
      }
      if (tier) {
        return amount
          ? `Payment of ${amount} Pi received for ${tier} subscription`
          : `Your ${tier} subscription payment was successful`;
      }
      if (date) {
        return `Your subscription will renew on ${date}`;
      }
      return amount ? `Payment of ${amount} Pi received` : 'Payment processed successfully';

    case 'follower':
      return count > 1
        ? `You have ${count} new followers this week`
        : `${userName} started following your business "${businessName}"`;

    case 'like':
      return count > 1
        ? `Your business "${businessName}" received ${count} new likes`
        : `${userName} liked your business "${businessName}"`;

    case 'bookmark':
      return count > 1
        ? `"${businessName}" was added to ${count} new bookmarks this week`
        : `${userName} bookmarked your business "${businessName}"`;

    case 'system':
      if (featureName) {
        return `New feature available: ${featureName}`;
      }
      if (date) {
        return `Scheduled maintenance on ${date}. Service may be temporarily unavailable.`;
      }
      return 'Welcome to Avante Maps! Complete your profile to get started';

    default:
      return 'You have a new notification';
  }
};
