import React, { useState, useEffect } from 'react';
import AnalyticsPanel from './AnalyticsPanel';
import { useAnalyticsData } from './hooks/useAnalyticsData';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/auth/useAuth';
import { SubscriptionTier } from '@/utils/piNetwork';
import { hasFeatureAccess } from '@/utils/piNetwork/subscription';


interface AnalyticsMainViewProps {
  handleExport: (format: 'csv' | 'pdf') => void;
}

interface UserBusiness {
  id: number;
  business_name: string;
}

const AnalyticsMainView: React.FC<AnalyticsMainViewProps> = ({ handleExport }) => {
  const { user } = useAuth();
  const [userBusinesses, setUserBusinesses] = useState<UserBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | undefined>();
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [annualSubCount, setAnnualSubCount] = useState(0);

  // Enable demo mode when no auth or no businesses (for preview testing)
  const isDemoMode = !user?.uid || userBusinesses.length === 0;

  // Fetch user's businesses and subscription info
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) {
        setLoadingBusinesses(false);
        return;
      }

      try {
        // Fetch businesses
        const { data, error } = await supabase
          .from('businesses')
          .select('id, business_name')
          .eq('owner_id', user.uid);

        if (error) {
          console.error('Error fetching businesses:', error);
        } else if (data && data.length > 0) {
          setUserBusinesses(data);
          setSelectedBusinessId(data[0]?.id);
        }

        // Fetch annual subscription count
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.uid)
          .eq('plan', 'annual');

        if (!subError && subData) {
          setAnnualSubCount(subData.length);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingBusinesses(false);
      }
    };

    fetchUserData();
  }, [user?.uid]);

  const { dateRange, setDateRange, engagementData, metrics, isLoading, error } = useAnalyticsData(
    isDemoMode ? undefined : selectedBusinessId,
    isDemoMode
  );

  const selectedBusiness = userBusinesses.find(b => b.id === selectedBusinessId);
  const displayBusinessName = isDemoMode ? 'Demo Business' : (selectedBusiness?.business_name || 'My Business');
  const displayBusinesses = isDemoMode ? [{ id: 0, business_name: 'Demo Business' }] : userBusinesses;
  const canExport = isDemoMode || hasFeatureAccess(user?.subscriptionTier || SubscriptionTier.INDIVIDUAL, SubscriptionTier.ORGANIZATION);
  
  // Loading state (skip if demo mode)
  if (loadingBusinesses && !isDemoMode) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-7xl min-w-0 overflow-x-hidden">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-7xl min-w-0 overflow-x-hidden">
      {isDemoMode && (
        <div className="mb-3 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs rounded-lg text-center">
          Demo Mode — showing sample data for preview testing
        </div>
      )}
      {isLoading ? (
        <Skeleton className="h-[520px] rounded-2xl" />
      ) : error ? (
        <Card className="text-center py-8 mb-4">
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <AnalyticsPanel
            businessName={displayBusinessName}
            businesses={displayBusinesses}
            selectedBusinessId={isDemoMode ? 0 : selectedBusinessId}
            onBusinessChange={isDemoMode ? () => {} : setSelectedBusinessId}
            data={engagementData}
            totalViews={metrics.totalViews}
            viewsTrend={metrics.viewsTrend}
            totalBookmarks={metrics.totalBookmarks}
            totalComments={metrics.totalComments}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onExport={handleExport}
            canExport={canExport}
            hasRenewedAnnualSubscription={isDemoMode || annualSubCount >= 2}
          />

          {metrics.totalViews === 0 && (
            <Card className="text-center py-8 mt-4">
              <CardContent>
                <p className="text-muted-foreground">
                  No view data yet. As users view your business listing, analytics will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

    </div>
  );
};

export default AnalyticsMainView;
