
import React from 'react';
import { useNavigate } from '@/lib/router-compat';
import AppLayout from '@/components/layout/AppLayout';
import AnalyticsMainView from '@/components/analytics/AnalyticsMainView';
import SubscriptionPrompt from '@/components/analytics/SubscriptionPrompt';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { SubscriptionTier } from '@/utils/piNetwork';

interface AnalyticsViewProps {
  handleExport: (format: 'csv' | 'pdf') => void;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ handleExport }) => {
  const navigate = useNavigate();
  const { hasPermission, isLoading } = useFeatureAccess(
    SubscriptionTier.SMALL_BUSINESS,
    { redirectTo: '' } // We'll handle redirection within the component
  );
  
  return (
    <AppLayout 
      title="Business Analytics"
      backButton={!hasPermission}
      withHeader={true}
      fullHeight={false}
      hideSidebar={false}
      onBackClick={!hasPermission ? () => navigate(-1) : undefined}
    >
      {!isLoading && !hasPermission ? (
        <SubscriptionPrompt />
      ) : (
        <AnalyticsMainView handleExport={handleExport} />
      )}
    </AppLayout>
  );
};

export default AnalyticsView;
