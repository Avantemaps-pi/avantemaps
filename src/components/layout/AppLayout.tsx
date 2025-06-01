
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import PageHeader from './PageHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showMenuButton?: boolean;
  backButton?: boolean;
  onBackClick?: () => void;
  withHeader?: boolean;
  fullHeight?: boolean;
  hideSidebar?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const AppLayout = ({ 
  children, 
  title, 
  showMenuButton = true,
  backButton = false,
  onBackClick,
  withHeader = true,
  fullHeight = true,
  hideSidebar = false,
  fullWidth = true,
  className = ""
}: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full bg-gray-50 ${className}`}>
        {!hideSidebar && <AppSidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {withHeader && (
            <PageHeader 
              title={title} 
              showMenuButton={showMenuButton && !hideSidebar}
              backButton={backButton}
              onBackClick={onBackClick}
            />
          )}
          <main className={`flex-1 ${fullHeight ? 'overflow-y-auto' : ''}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
