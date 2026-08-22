
import React from 'react';
import { Link, useLocation, useNavigate } from '@/lib/router-compat';
import { ArrowLeft, Menu, MoreVertical } from 'lucide-react';
import MobileMenuButton from './header/MobileMenuButton';
import DesktopMenuButton from './header/DesktopMenuButton';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import AuthStatus from '@/components/auth/AuthStatus';
import SearchBar from '@/components/map/SearchBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PageHeaderProps {
  title?: string | undefined;
  hideSidebar?: boolean | undefined;
  onSearch?: ((searchTerm: string) => void) | undefined;
  showSearch?: boolean | undefined;
  backButton?: boolean | undefined;
  onBackClick?: (() => void) | undefined;
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
  const isBookmarksPage = location.pathname === '/bookmarks';

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
    <header className="sticky top-0 z-10 h-16 border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center px-[14px] bg-transparent">
        <div className="flex items-center">
          {/* Show menu buttons only on pages without back button */}
          {!isAnalyticsPage && !hideSidebar && !isRegistrationPage && !isIndexPage && !isVerificationInfoPage && !isUpdateRegistrationPage && <MobileMenuButton />}
          {!isAnalyticsPage && !hideSidebar && !isRegistrationPage && !isIndexPage && !isVerificationInfoPage && !isUpdateRegistrationPage && <DesktopMenuButton onClick={() => console.log('Desktop menu clicked')} />}
          
          {/* Index page menu button */}
          {isIndexPage && (
            <Button variant="ghost" size="icon" onClick={handleMenuClick} className="mr-2 sm:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          {/* Consolidated back button for all pages that need it */}
          {(isAnalyticsPage || isRegistrationPage || isUpdateRegistrationPage || isVerificationInfoPage || backButton) && (
            <Button variant="ghost" size="icon" onClick={handleBackClick} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <div className={`flex-1 flex ${showSearch && isIndexPage ? 'items-center justify-between' : 'justify-center'}`}>
          {pageTitle ? 
            <h1 id="page-title" className="text-xl font-semibold">{pageTitle}</h1> 
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
          {isBookmarksPage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  Delete all Bookmarks
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <AuthStatus />
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
