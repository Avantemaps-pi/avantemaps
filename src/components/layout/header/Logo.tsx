
import React from 'react';
import { Link } from '@/lib/router-compat';
import { PiSquare } from 'lucide-react';

interface LogoProps {
  title?: string;
}

const Logo = ({ title = "Avante Maps" }: LogoProps) => {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="bg-gradient-to-r from-avante-blue to-avante-purple p-2.5 rounded-md">
        <PiSquare className="h-6 w-6 text-white" />
      </div>
      <div className="hidden md:flex flex-col">
        <span className="font-bold text-xl bg-gradient-to-r from-avante-blue to-avante-purple bg-clip-text text-transparent">
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
