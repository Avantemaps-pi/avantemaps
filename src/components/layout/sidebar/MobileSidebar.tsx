
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface MobileSidebarProps {
  isOpen: boolean;
  navItems: NavItemType[];
  legalItems: NavItemType[];
  currentPath: string;
  onClose: () => void;
  onLinkClick: () => void;
}

const MobileSidebar = ({ 
  isOpen, 
  navItems, 
  legalItems, 
  currentPath, 
  onClose, 
  onLinkClick 
}: MobileSidebarProps) => {
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

  const handleLinkClick = () => {
    onLinkClick();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="absolute left-0 top-0 h-full w-80 bg-background border-r shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <Link to="/" onClick={handleLinkClick}>
              <AvanteMapLogo size="medium" />
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavItem 
                  key={item.to}
                  item={item} 
                  currentPath={currentPath} 
                  onLinkClick={handleLinkClick}
                  isMobile={true}
                />
              ))}
            </nav>
            
            <Separator className="my-4" />
            
            <nav className="space-y-2">
              {legalItems.map((item) => (
                <NavItem 
                  key={item.to}
                  item={item} 
                  currentPath={currentPath} 
                  onLinkClick={handleLinkClick}
                  isMobile={true}
                />
              ))}
            </nav>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-muted-foreground">Current Plan:</div>
              <Badge variant="secondary" className="w-fit">
                {getSubscriptionDisplay()}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSidebar;
