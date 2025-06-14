
import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

interface MobileMenuButtonProps {
  onClick?: () => void;
}

const MobileMenuButton = ({
  onClick
}: MobileMenuButtonProps) => {
  const {
    setOpenMobile
  } = useSidebar();
  
  const handleClick = () => {
    setOpenMobile(true);
    if (onClick) onClick();
  };
  
  return (
    <Button variant="ghost" size="icon" onClick={handleClick} className="mr-2 lg:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  );
};

export default MobileMenuButton;
