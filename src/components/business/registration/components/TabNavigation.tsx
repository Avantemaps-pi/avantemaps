
import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TabNavigationProps {
  isMobile: boolean;
  disabled?: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ isMobile, disabled }) => {
  const tabs = [
    { value: "business-owner", label: isMobile ? "Owner" : "Business Owner" },
    { value: "contact", label: "Contact" },
    { value: "address", label: "Address" },
    { value: "hours", label: "Hours" },
    { value: "details", label: "Details" },
  ];

  if (isMobile) {
    return (
      <>
        <div className="flex items-center justify-between mb-3 w-full relative">
          {tabs.slice(0, 3).map((tab, index) => (
            <React.Fragment key={tab.value}>
              <TabsTrigger 
                value={tab.value}
                className={cn(
                  "flex-1 text-sm whitespace-nowrap relative z-10 rounded-md",
                  "data-[state=active]:bg-avante-blue data-[state=active]:text-white",
                  "data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground"
                )}
                disabled={disabled}
              >
                {tab.label}
              </TabsTrigger>
              {index < 2 && (
                <div className="h-0.5 flex-1 bg-border mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center justify-between mb-6 w-full relative">
          {tabs.slice(3).map((tab, index) => (
            <React.Fragment key={tab.value}>
              <TabsTrigger 
                value={tab.value}
                className={cn(
                  "flex-1 text-sm whitespace-nowrap relative z-10 rounded-md",
                  "data-[state=active]:bg-avante-blue data-[state=active]:text-white",
                  "data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground"
                )}
                disabled={disabled}
              >
                {tab.label}
              </TabsTrigger>
              {index < 1 && (
                <div className="h-0.5 flex-1 bg-border mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center justify-between mb-6 w-full relative">
      {tabs.map((tab, index) => (
        <React.Fragment key={tab.value}>
          <TabsTrigger 
            value={tab.value}
            className={cn(
              "flex-1 text-sm whitespace-nowrap relative z-10 rounded-md",
              "data-[state=active]:bg-avante-blue data-[state=active]:text-white",
              "data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground"
            )}
            disabled={disabled}
          >
            {tab.label}
          </TabsTrigger>
          {index < tabs.length - 1 && (
            <div className="h-0.5 flex-1 bg-border mx-1" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default TabNavigation;
