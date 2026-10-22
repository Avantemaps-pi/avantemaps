import React from 'react';
import { Link } from '@/lib/router-compat';
import AvanteMark from '@/components/brand/AvanteMark';
interface AvanteMapLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}
const AvanteMapLogo: React.FC<AvanteMapLogoProps> = ({
  size = 'medium',
  showText = true
}) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-8 w-8',
    large: 'h-10 w-10'
  };
  return <Link to="/" className="flex items-center gap-2">
      <AvanteMark weight="bold" className={`${sizeClasses[size]} text-primary`} title={showText ? undefined : 'Avante Maps'} />
      {showText && <span className="font-semibold text-foreground">Avante Maps</span>}
    </Link>;
};
export default AvanteMapLogo;