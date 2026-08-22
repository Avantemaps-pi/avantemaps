
import React from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PricingHeaderProps {
  title: string;
  description: string;
  billingOptions: string[];
  selectedBilling: string;
  onBillingChange: (frequency: string) => void;
}

const PricingHeader = ({ 
  title, 
  description, 
  billingOptions, 
  selectedBilling, 
  onBillingChange 
}: PricingHeaderProps) => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate(-1);
  };
  
  return (
    <div className="space-y-7 text-center">
      <Button variant="ghost" size="icon" className="absolute left-4 top-4" onClick={handleBack}>
        <ArrowLeft className="h-5 w-5" />
        <span className="sr-only">Go back</span>
      </Button>
      
      <div className="space-y-4">
        <h1 className="text-4xl font-medium md:text-5xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      <div className="mx-auto flex w-fit rounded-full bg-muted p-1.5">
        {billingOptions.map((option) => (
          <button
            key={option}
            onClick={() => onBillingChange(option)}
            className={`relative flex h-10 items-center justify-center rounded-full px-6 text-sm font-medium transition ${
              selectedBilling === option
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
            {option === "yearly" && selectedBilling === option && (
              <span className="absolute -right-12 flex h-6 items-center justify-center rounded-full bg-green-600 px-2 text-[10px] font-medium text-white shadow-xs">
                Save 20%
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PricingHeader;
