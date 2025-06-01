
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import MobileMenuButton from './header/MobileMenuButton';
import DesktopMenuButton from './header/DesktopMenuButton';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import AuthStatus from '@/components/auth/AuthStatus';
import SearchBar from '@/components/map/SearchBar';

interface PageHeaderProps {
  title?: string;
  hideSidebar?: boolean;
  onSearch?: (searchTerm: string) => void;
  showSearch?: boolean;
  backButton?: boolean;
  onBackClick?: () => void;
}

const PageHeader = ({
  title = "Avante Maps",
  hideSidebar = false,
  onSearch,
  showSearch = false,
  backButton = false,
  onBackClick
}: PageHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();
  
  const isAnalyticsPage = location.pathname === '/analytics';
  const isRegistrationPage = location.pathname === '/registration';
  const isIndexPage = location.pathname === '/';
  const isUpdateRegistrationPage = location.pathname.includes('/update-registration');
  const isVerificationInfoPage = location.pathname === '/verification-info';

  // Get page title based on current route
  const getPageTitle = () => {
    if (isIndexPage) return null; // No title for homepage
    if (isAnalyticsPage) return "Business Analytics";
    if (isRegistrationPage) return "Register Business";
    if (isUpdateRegistrationPage) return "Update Business";
    if (isVerificationInfoPage) return "Verification & Certification";

    // Default titles for other routes
    switch (location.pathname) {
      case '/recommendations':
        return "Recommendations";
      case '/bookmarks':
        return "Bookmarks";
      case '/communicon':
        return "Communicon";
      case '/notifications':
        return "Notifications";
      case '/registered-business':
        return "Your Businesses";
      case '/review':
        return "Write a Review";
      case '/contact':
        return "Contact Us";
      case '/about':
        return "About";
      case '/settings':
        return "Settings";
      case '/terms':
        return "Terms of Service";
      case '/privacy':
        return "Privacy Policy";
      case '/cookies':
        return "Cookie Policy";
      case '/pricing':
        return "Pricing Plans";
      default:
        return title;
    }
  };
  
  const pageTitle = getPageTitle();
  
  const handleMenuClick = () => {
    setOpenMobile(true);
  };

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };
  
  return (
    <header className="sticky top-0 z-10 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center px-[14px] bg-transparent">
        <div className="flex items-center">
          {!isAnalyticsPage && !hideSidebar && !isRegistrationPage && !isIndexPage && <MobileMenuButton />}
          {!isAnalyticsPage && !hideSidebar && !isRegistrationPage && !isIndexPage && <DesktopMenuButton onClick={() => console.log('Desktop menu clicked')} />}
          
          {isIndexPage && <Button variant="ghost" size="icon" onClick={handleMenuClick} className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>}
          
          {(isAnalyticsPage || backButton) && <Button variant="ghost" size="icon" onClick={handleBackClick} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>}
          
          {isRegistrationPage && <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>}
          
          {isVerificationInfoPage && <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>}
        </div>
        
        <div className={`flex-1 flex ${showSearch && isIndexPage ? 'items-center justify-between' : 'justify-center'}`}>
          {pageTitle ? 
            <h1 className="text-xl font-semibold">{pageTitle}</h1> 
            : 
            <Link to="/" className="flex items-center gap-2">
              {/* Logo would go here */}
            </Link>
          }
          
          {showSearch && isIndexPage && onSearch && (
            <div className="max-w-md w-full mx-4">
              <SearchBar 
                onSearch={onSearch} 
                placeholders={[
                  "Search for Address", 
                  "Search for Business name", 
                  "Search for Business Type", 
                  "Search for Keywords"
                ]} 
                cycleInterval={3000} 
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <AuthStatus />
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
