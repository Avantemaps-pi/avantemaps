
import React from 'react';
import { Link } from 'react-router-dom';
import MobileMenuButton from './header/MobileMenuButton';
import AvanteMapLogo from './header/AvanteMapLogo';

interface PageHeaderProps {
  title?: string;
  showMenuButton?: boolean;
}

const PageHeader = ({ title, showMenuButton = true }: PageHeaderProps) => {
  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="flex h-14 items-center px-4 lg:px-6">
        <div className="flex items-center gap-4">
          {showMenuButton && <MobileMenuButton />}
          <Link to="/" className="flex items-center gap-2">
            <AvanteMapLogo size="small" />
          </Link>
        </div>
        {title && (
          <div className="flex-1 flex justify-center">
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
