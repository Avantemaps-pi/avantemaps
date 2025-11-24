
import {
  Map,
  LayoutGrid,
  Bookmark,
  Bell,
  Building,
  MessageSquare,
  Settings,
  Info,
  Lock,
  FileText,
  Phone,
  Cookie,
  FileCode,
} from 'lucide-react';

// Create a function to dynamically get the notification count
import { getUnreadNotificationsCount } from '@/utils/notificationUtils';

export const navItems = [
  {
    to: '/',
    icon: Map,
    label: 'Map',
  },
  {
    to: '/recommendations',
    icon: LayoutGrid,
    label: 'Recommendations',
  },
  {
    to: '/bookmarks',
    icon: Bookmark,
    label: 'Bookmarks',
  },
  {
    to: '/notifications',
    icon: Bell,
    label: 'Notifications',
    // Badge will be set dynamically in AppSidebar
  },
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
    to: '/settings',
    icon: Settings,
    label: 'Settings',
  },
  {
    to: '/notification-templates',
    icon: FileCode,
    label: 'Templates',
  },
  {
    to: '/bulk-notifications',
    icon: Bell,
    label: 'Bulk Notifications',
  },
  {
    to: '/contact',
    icon: Phone,
    label: 'Contact Us',
  },
  {
    to: '/about',
    icon: Info,
    label: 'About Us',
  },
];

export const legalItems = [
  {
    to: '/privacy', // Updated from '/privacy-policy'
    icon: Lock,
    label: 'Privacy Policy',
  },
  {
    to: '/terms', // Updated from '/terms-of-service'
    icon: FileText,
    label: 'Terms of Service',
  },
  {
    to: '/cookies',
    icon: Cookie,
    label: 'Cookie Policy',
  },
];
