
import React, { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import PageHeader from '@/components/layout/PageHeader';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  withHeader?: boolean;
  fullHeight?: boolean;
  fullWidth?: boolean;
  hideSidebar?: boolean;
  onSearch?: (searchTerm: string) => void;
  showSearch?: boolean;
  className?: string;
  backButton?: boolean;
  onBackClick?: () => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  title,
  withHeader = true, 
  fullHeight = false,
  fullWidth = false,
  hideSidebar = false,
  onSearch,
  showSearch = false,
  className = '',
  backButton = false,
  onBackClick
}) => {
  const contentClasses = `flex flex-col ${fullHeight ? 'h-screen' : 'min-h-screen'} ${fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} ${className}`;
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {!hideSidebar && <AppSidebar />}
        
        <div className={contentClasses}>
          {withHeader && (
            <PageHeader 
              title={title} 
              hideSidebar={hideSidebar} 
              onSearch={onSearch}
              showSearch={showSearch}
              backButton={backButton}
              onBackClick={onBackClick}
            />
          )}
          
          <main className="flex-1 w-full overflow-auto">
            {children}
          </main>
          
          <Toaster />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
