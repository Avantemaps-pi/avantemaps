
import React from 'react';
import { Link } from '@/lib/router-compat';
import AvanteMark from '@/components/brand/AvanteMark';

interface LogoProps {
  title?: string;
}

const Logo = ({ title = "Avante Maps" }: LogoProps) => {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="bg-primary p-2.5 rounded-md">
        <AvanteMark weight="bold" className="h-6 w-6 text-primary-foreground" />
      </div>
      <div className="hidden md:flex flex-col">
        <span className="font-bold text-xl text-brand-navy">
          {title}
        </span>
        <span className="text-xs text-muted-foreground">Pi Payment Finder</span>
      </div>
      <span className="md:hidden font-bold text-xl">
        {title}
      </span>
    </Link>
  );
};

export default Logo;
