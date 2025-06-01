
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import AvanteMapLogo from '../header/AvanteMapLogo';
import NavItem from './NavItem';

interface NavItemType {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
}

interface DesktopSidebarProps {
  className?: string;
  navItems: NavItemType[];
  legalItems: NavItemType[];
  currentPath: string;
  onLinkClick: () => void;
}

const DesktopSidebar = ({ 
  className, 
  navItems, 
  legalItems, 
  currentPath, 
  onLinkClick 
}: DesktopSidebarProps) => {
  const { user } = useAuth();
  
  // Get the subscription tier display name
  const getSubscriptionDisplay = () => {
    if (!user?.subscriptionTier) return 'Individual';
    
    switch (user.subscriptionTier) {
      case 'small_business':
        return 'Small Business';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Individual';
    }
  };

  return (
    <Sidebar className={className}>
      <SidebarHeader className="p-4">
        <Link to="/" onClick={onLinkClick}>
          <AvanteMapLogo size="medium" />
        </Link>
      </SidebarHeader>
      
      <SidebarContent className="px-3">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <NavItem 
                item={item} 
                currentPath={currentPath} 
                onLinkClick={onLinkClick} 
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        <Separator className="my-4" />
        
        <SidebarMenu>
          {legalItems.map((item) => (
            <SidebarMenuItem key={item.to}>
              <NavItem 
                item={item} 
                currentPath={currentPath} 
                onLinkClick={onLinkClick} 
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-muted-foreground">Current Plan:</div>
          <Badge variant="secondary" className="w-fit">
            {getSubscriptionDisplay()}
          </Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DesktopSidebar;
