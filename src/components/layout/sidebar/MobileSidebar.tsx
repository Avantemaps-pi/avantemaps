
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X, UserRound, LogIn, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NavItem from './NavItem';
import { useAuth } from '@/context/auth';
import { cn } from '@/lib/utils';
import { legalItems } from './sidebarConfig';

interface MobileSidebarProps {
  isOpen: boolean;
  navItems: Array<{
    to: string;
    icon: React.ElementType;
    label: string;
    badge?: number | null;
  }>;
  currentPath: string;
  onClose: () => void;
  onLinkClick: () => void;
}

const MobileSidebar = ({
  isOpen,
  navItems,
  currentPath,
  onClose,
  onLinkClick
}: MobileSidebarProps) => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    login,
    logout,
    isLoading
  } = useAuth();

  const username = user?.username || 'Guest';
  
  const formatPlanType = (tier?: string) => {
    if (!tier) return 'Individual';
    return tier.charAt(0).toUpperCase() + tier.slice(1).replace('-', ' ');
  };
  
  const planType = formatPlanType(user?.subscriptionTier);

  const handleLogin = () => {
    login();
    onClose();
  };
  
  const handleLogout = () => {
    logout();
    onClose();
  };

  const handlePlanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/pricing');
    onClose();
  };

  const handleIndividualPlanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/pricing');
    onClose();
  };

  const handleProfileClick = () => {
    navigate('/settings');
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
      
      <div className={`fixed inset-y-0 left-0 w-4/5 max-w-[300px] bg-background z-[60] transform transition-transform duration-300 ease-in-out shadow-xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleProfileClick}>
              <Avatar className="h-9 w-9 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>
                  <UserRound className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm cursor-pointer hover:text-primary transition-colors">{username}</span>
                <span className="text-xs text-muted-foreground">
                  <span 
                    className={cn(
                      "cursor-pointer hover:text-primary transition-colors",
                      user?.subscriptionTier === 'organization' && "text-purple-500 font-medium",
                      user?.subscriptionTier === 'small-business' && "text-blue-500 font-medium",
                      user?.subscriptionTier === 'individual' && "text-green-500"
                    )}
                    onClick={handleIndividualPlanClick}
                  >
                    {planType}
                  </span> <span 
                    className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={handlePlanClick}
                  >
                    Plan
                  </span>
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 flex flex-col">
            {!isAuthenticated && (
              <div className="px-2 mb-4">
                <Button onClick={handleLogin} disabled={isLoading} className="w-full flex items-center bg-blue-500 hover:bg-blue-600 text-white">
                  <LogIn className="h-4 w-4 mr-2" />
                  {isLoading ? "Authenticating..." : "Login with Pi Network"}
                </Button>
              </div>
            )}
            
            <nav>
              <ul className="space-y-1 px-2">
                {navItems.map(item => <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={currentPath === item.to} onClick={onLinkClick} badge={item.badge} />)}
              </ul>
            </nav>

            {isAuthenticated && (
              <div className="mt-auto px-2 pt-4">
                <Button onClick={handleLogout} disabled={isLoading} className="w-full bg-white hover:bg-gray-100 border border-red-500 text-red-500">
                  <LogOut className="h-4 w-4 mr-2 text-red-500" />
                  Logout
                </Button>
              </div>
            )}
          </div>
          
          {/* Compact Footer */}
          <div className="px-4 py-3 border-t border-sidebar-border bg-muted/30 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <Link 
                to="/pricing" 
                onClick={onLinkClick}
                className="hover:text-primary transition-colors font-medium"
              >
                Pricing
              </Link>
              <span className="text-border">·</span>
              {legalItems.map((item, index, arr) => (
                <React.Fragment key={item.to}>
                  <Link 
                    to={item.to} 
                    onClick={onLinkClick}
                    className="hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                  {index < arr.length - 1 && (
                    <span className="text-border">·</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} Avante Maps Pty Ltd
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
