
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick?: () => void;
  badge?: number | null;
  isLogout?: boolean;
  requiresAuth?: boolean;
}

const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  isActive, 
  onClick, 
  badge, 
  isLogout,
  requiresAuth = false 
}: NavItemProps) => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
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
    
    if (onClick) {
      onClick();
    }
  };
  
  return (
    <li>
      <Link 
        to={to} 
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground relative",
          isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground"
        )}
        onClick={handleClick}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
        {badge && (
          <span className="absolute right-4 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
};

export default NavItem;
