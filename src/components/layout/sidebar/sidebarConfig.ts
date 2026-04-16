
import {
  Building,
  MessageSquare,
  Info,
  Bell,
} from 'lucide-react';

import { getUnreadNotificationsCount } from '@/utils/notificationUtils';

export const navItems = [
  {
    to: '/registered-business',
    icon: Building,
    label: 'Registered Business',
  },
  {
    to: '/communicon',
    icon: MessageSquare,
    label: 'CommuniCon',
  },
  {
    to: '/about',
    icon: Info,
    label: 'About Us',
  },
  {
    to: '/notification-admin',
    icon: Bell,
    label: 'Notification Admin',
    adminOnly: true,
  },
];

export const legalItems = [
  {
    to: '/privacy',
    label: 'Privacy Policy',
  },
  {
    to: '/terms',
    label: 'Terms of Service',
  },
  {
    to: '/cookies',
    label: 'Cookie Policy',
  },
  {
    to: '/contact',
    label: 'Contact Us',
  },
];

