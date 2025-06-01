
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import PageHeader from './PageHeader';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showMenuButton?: boolean;
}

const AppLayout = ({ children, title, showMenuButton = true }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader title={title} showMenuButton={showMenuButton} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
