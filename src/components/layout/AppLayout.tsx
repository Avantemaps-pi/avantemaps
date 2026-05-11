
import React, { ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import PageHeader from '@/components/layout/PageHeader';
import Footer from '@/components/layout/Footer';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import BottomNavBar from './BottomNavBar';
import { useIsMobile } from '@/hooks/use-mobile';

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
  showFooter?: boolean;
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
  onBackClick,
  showFooter = true
}) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const contentClasses = `flex min-w-0 flex-col ${fullHeight ? 'h-screen' : 'min-h-screen'} ${fullWidth ? 'w-full' : 'max-w-7xl mx-auto w-full'} ${className}`;

  // Move focus to the page title (or main region) on route change so screen
  // readers announce the new page and keyboard users land in the new content.
  useEffect(() => {
    const focusTarget =
      (document.getElementById('page-title') as HTMLElement | null) ?? mainRef.current;
    if (!focusTarget) return;
    const prevTabIndex = focusTarget.getAttribute('tabindex');
    if (prevTabIndex === null) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
    // Avoid leaving a persistent focus ring on headings
    const handleBlur = () => {
      if (prevTabIndex === null) focusTarget.removeAttribute('tabindex');
      focusTarget.removeEventListener('blur', handleBlur);
    };
    focusTarget.addEventListener('blur', handleBlur);
  }, [location.pathname]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden">
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
          
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            aria-labelledby="page-title"
            className={`flex-1 w-full min-w-0 overflow-x-hidden overflow-y-auto animate-fade-in outline-none ${isMobile ? 'pb-24' : ''}`}
            style={isMobile ? { paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' } : undefined}
          >
            {children}
          </main>

          
          {showFooter && <Footer />}
          <BottomNavBar />
          <Toaster />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
