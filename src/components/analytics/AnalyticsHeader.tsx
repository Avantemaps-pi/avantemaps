
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download } from 'lucide-react';

interface BusinessOption {
  id: number;
  business_name: string;
}

interface AnalyticsHeaderProps {
  businessName: string;
  businesses: BusinessOption[];
  selectedBusinessId?: number;
  onBusinessChange?: (id: number) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  onExport: (format: 'csv' | 'pdf') => void;
  hasAnnualSubscription?: boolean;
  hasRenewedAnnualSubscription?: boolean;
}

const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  businessName,
  businesses,
  selectedBusinessId,
  onBusinessChange,
  dateRange,
  onDateRangeChange,
  onExport,
  hasAnnualSubscription = false,
  hasRenewedAnnualSubscription = false,
}) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex min-w-0 flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
      <div className="min-w-0 max-w-full">
        <h1 className="text-2xl font-bold tracking-tight">
          {businesses.length > 1 && onBusinessChange ? (
            <Select value={selectedBusinessId?.toString()} onValueChange={(v) => onBusinessChange(parseInt(v))}>
              <SelectTrigger className="inline-flex w-auto border-none shadow-none p-0 h-auto text-2xl font-bold gap-1 [&>svg]:h-5 [&>svg]:w-5">
                <SelectValue placeholder={businessName} />
              </SelectTrigger>
              <SelectContent>
                {businesses.map(b => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.business_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span>{businessName}</span>
          )}
          {' '}<span className="text-muted-foreground font-normal">Analytics</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your business performance and engagement metrics
        </p>
      </div>
      
      <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2 self-end sm:self-auto sm:flex-nowrap">
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-[140px]">
            <CalendarIcon className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Day, Week, Month, Quarter, Year" />
          </SelectTrigger>
           <SelectContent>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
            {hasRenewedAnnualSubscription && (
              <SelectItem value="year">Year</SelectItem>
            )}
          </SelectContent>
        </Select>
        
        <Select onValueChange={(value) => onExport(value as 'csv' | 'pdf')}>
          <SelectTrigger className="w-[120px]">
            <Download className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Export" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">Export as CSV</SelectItem>
            <SelectItem value="pdf">Export as PDF</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default AnalyticsHeader;
