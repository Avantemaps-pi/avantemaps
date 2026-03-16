
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import NavItem from './NavItem';
import { useAuth } from '@/context/auth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
interface DesktopSidebarProps {
  className?: string;
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
  onLinkClick: () => void;
}
const DesktopSidebar = ({
  className,
  navItems,
  legalItems,
  currentPath,
  onLinkClick
}: DesktopSidebarProps) => {
  const {
    isAuthenticated,
    login,
    logout,
    isLoading
  } = useAuth();
  
  const handleLogin = () => {
    login();
    onLinkClick();
  };
  
  const handleLogout = () => {
    logout();
    onLinkClick();
  };
  return <Sidebar className={cn("hidden md:flex", className)}>
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">Avante Maps</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Pi Network Directory</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-8">
          {!isAuthenticated && (
            <div className="mb-2">
              <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                <LogIn className="h-4 w-4 mr-2" />
                {isLoading ? "Authenticating..." : "Login with Pi Network"}
              </Button>
            </div>
          )}

          <nav>
            <ul className="space-y-1">
              {navItems.map(item => <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={currentPath === item.to} onClick={onLinkClick} badge={item.badge} />)}
            </ul>
          </nav>

          <div>
            <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-3">Legal</h3>
            <ul className="space-y-1">
              {legalItems.map(item => <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} isActive={currentPath === item.to} onClick={onLinkClick} />)}
            </ul>
            {isAuthenticated && (
              <div className="mt-4">
                <Button onClick={handleLogout} disabled={isLoading} className="w-full bg-white hover:bg-gray-100 border border-red-500 text-red-500">
                  <LogOut className="h-4 w-4 mr-2 text-red-500" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
        <p>© 2025 Avante Maps</p>
        <p>By Avante Maps Pty Ltd</p>
        <div className="mt-2 flex items-center">
          
          
        </div>
      </SidebarFooter>
    </Sidebar>;
};
export default DesktopSidebar;
