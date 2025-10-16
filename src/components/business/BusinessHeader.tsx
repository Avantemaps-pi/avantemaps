
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface BusinessHeaderProps {
  title: string;
  subtitle?: string;
  showButton?: boolean;
}

const BusinessHeader = ({ title, subtitle, showButton = true }: BusinessHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {showButton && <Button onClick={() => navigate('/registration')}>Register New Business</Button>}
    </div>
  );
};

export default BusinessHeader;
