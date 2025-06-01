
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, UserRound, LogIn, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NavItem from './NavItem';
import { useAuth } from '@/context/auth';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  isOpen: boolean;
  navItems: Array<{
    to: string;
    icon: React.ElementType;
    label: string;
    badge?: number | null;
  }>;
  legalItems: Array<{
    to: string;
    icon: React.ElementType;
    label: string;
  }>;
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
  const { user, isAuthenticated, login, logout, isLoading } = useAuth();
  const username = user?.username || 'Guest';
  
  const formatPlanType = (tier?: string) => {
    if (!tier) return 'Individual';
    return tier.charAt(0).toUpperCase() + tier.slice(1).replace('-', ' ');
  };
  
  const planType = formatPlanType(user?.subscriptionTier);

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
    } else {
      login();
    }
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <div className={`fixed inset-y-0 left-0 w-4/5 max-w-[300px] bg-background z-50 transform transition-transform duration-300 ease-in-out shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>
                  <UserRound className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{username}</span>
                <span className="text-xs text-muted-foreground">{planType} Plan</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-2 mb-4">
              <Button 
                onClick={handleAuthAction} 
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center",
                  isAuthenticated 
                    ? "bg-white hover:bg-gray-100 border border-red-500 text-red-500" 
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                )}
              >
                {isAuthenticated ? (
                  <>
                    <LogOut className="h-4 w-4 mr-2 text-red-500" />
                    Logout
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    {isLoading ? "Authenticating..." : "Login with Pi"}
                  </>
                )}
              </Button>
            </div>
            
            <nav>
              <ul className="space-y-1 px-2">
                {navItems.map((item) => (
                  <NavItem 
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    isActive={currentPath === item.to}
                    onClick={onLinkClick}
                    badge={item.badge}
                  />
                ))}
              </ul>
            </nav>

            <div className="mt-6 px-2">
              <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-3">Legal</h3>
              <ul className="space-y-1">
                {legalItems.map((item) => (
                  <NavItem 
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    isActive={currentPath === item.to}
                    onClick={onLinkClick}
                  />
                ))}
              </ul>
            </div>
          </div>
          
          <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
            <p>© 2025 Avante Maps</p>
            <p>Architectured by Avante Maps Pty Ltd</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
