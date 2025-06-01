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
  return;
};
export default MobileMenuButton;