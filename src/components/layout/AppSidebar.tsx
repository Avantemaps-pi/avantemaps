import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopSidebar from './sidebar/DesktopSidebar';
import MobileSidebar from './sidebar/MobileSidebar';
import { navItems, legalItems } from './sidebar/sidebarConfig';
import { getUnreadNotificationsCount } from '@/utils/notificationUtils';

interface AppSidebarProps {
  className?: string;
}

const AppSidebar = ({ className }: AppSidebarProps = {}) => {
  const location = useLocation();
  const { openMobile, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const [notificationCount, setNotificationCount] = useState(0);
  
  useEffect(() => {
    const updateNotifications = async () => {
      const count = await getUnreadNotificationsCount();
      setNotificationCount(count);
    };
    
    updateNotifications();
    
    window.addEventListener('notificationUpdate', updateNotifications);
    
    return () => {
      window.removeEventListener('notificationUpdate', updateNotifications);
    };
  }, []);
  
  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  // Update notification badge in navItems
  const updatedNavItems = navItems.map(item => 
    item.to === '/notifications' 
      ? { ...item, badge: notificationCount }
      : item
  );

  return (
    <>
      {!isMobile ? (
        <DesktopSidebar
          className={className}
          navItems={updatedNavItems}
          legalItems={legalItems}
          currentPath={location.pathname}
          onLinkClick={handleLinkClick}
        />
      ) : (
        <MobileSidebar
          isOpen={openMobile}
          navItems={updatedNavItems}
          legalItems={legalItems}
          currentPath={location.pathname}
          onClose={() => setOpenMobile(false)}
          onLinkClick={handleLinkClick}
        />
      )}
    </>
  );
};

export default AppSidebar;
