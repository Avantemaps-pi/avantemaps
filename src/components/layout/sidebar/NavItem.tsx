
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth';

interface NavItemType {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
}

interface NavItemProps {
  item: NavItemType;
  currentPath: string;
  onLinkClick: () => void;
  isMobile?: boolean;
}

const NavItem = ({ 
  item,
  currentPath,
  onLinkClick,
  isMobile = false
}: NavItemProps) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const isActive = currentPath === item.to;
  const isLogout = item.to === '/logout';
  const requiresAuth = item.to === '/registered-business' || item.to === '/analytics';
  
  // If this is an auth-required item and user is not authenticated, don't render
  if (requiresAuth && !isAuthenticated) {
    return null;
  }
  
  const handleClick = (e: React.MouseEvent) => {
    if (isLogout) {
      e.preventDefault();
      logout();
      navigate('/');
    }
    
    if (onLinkClick) {
      onLinkClick();
    }
  };
  
  const baseClasses = isMobile 
    ? "flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-gray-100" 
    : "flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground relative";
  
  const activeClasses = isMobile
    ? "bg-gray-100 font-medium"
    : "bg-sidebar-accent text-sidebar-accent-foreground font-medium";
    
  const inactiveClasses = isMobile
    ? "text-gray-700"
    : "text-sidebar-foreground";
  
  return (
    <Link 
      to={item.to} 
      className={cn(
        baseClasses,
        isActive ? activeClasses : inactiveClasses
      )}
      onClick={handleClick}
    >
      <item.icon className="h-5 w-5" />
      <span>{item.label}</span>
      {item.badge && item.badge > 0 && (
        <span className="absolute right-4 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
          {item.badge}
        </span>
      )}
    </Link>
  );
};

export default NavItem;
