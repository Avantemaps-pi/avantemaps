
import {
  Building,
  MessageSquare,
  Info,
  Bell,
  Wallet,
} from 'lucide-react';

import { getUnreadNotificationsCount } from '@/utils/notificationUtils';

export const navItems = [
  {
    to: '/notifications',
    icon: Bell,
    label: 'Notifications',
  },
  {
    to: '/registered-business',
    icon: Building,
    label: 'Registered Business',
  },
  // Plans are upgraded from the Wallet, so it sits with the business items
  {
    to: '/wallet',
    icon: Wallet,
    label: 'Wallet',
  },
  // On phones CommuniCon is in the bottom nav; the desktop side menu still lists it
  {
    to: '/communicon',
    icon: MessageSquare,
    label: 'CommuniCon',
    desktopOnly: true,
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

