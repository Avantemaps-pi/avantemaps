
import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DesktopMenuButtonProps {
  onClick: () => void;
}

const DesktopMenuButton = ({
  onClick
}: DesktopMenuButtonProps) => {
  return (
    <Button variant="ghost" size="icon" onClick={onClick} className="mr-2 hidden sm:flex md:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  );
};

export default DesktopMenuButton;
