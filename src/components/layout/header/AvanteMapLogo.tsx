import React from 'react';
import { Link } from 'react-router-dom';
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
      <div className="bg-white/90 rounded-full p-1 shadow-xs">
        
      </div>
      {showText}
    </Link>;
};
export default AvanteMapLogo;