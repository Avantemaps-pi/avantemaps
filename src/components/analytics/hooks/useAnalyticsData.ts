import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessStats {
  total_views: number;
  total_bookmarks: number;
  total_comments: number;
  views_this_week: number;
  views_last_week: number;
}

interface DailyViewData {
  view_date: string;
  view_count: number;
}

interface EngagementDataPoint {
  name: string;
  views: number;
  clicks: number;
  bookmarks: number;
}

// Generate mock data for demo/preview mode
const generateMockData = (days: number, isHourly = false): DailyViewData[] => {
  const data: DailyViewData[] = [];
  if (isHourly) {
    for (let i = 23; i >= 0; i--) {
      const date = new Date();
      date.setHours(date.getHours() - i, 0, 0, 0);
      const base = 1 + Math.floor(Math.random() * 5);
      data.push({
        view_date: date.toISOString(),
        view_count: base,
      });
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const base = 3 + Math.floor(Math.random() * 8);
      const spike = Math.random() > 0.8 ? Math.floor(Math.random() * 10) : 0;
      data.push({
        view_date: date.toISOString().split('T')[0],
        view_count: base + spike,
      });
    }
  }
  return data;
};

const MOCK_STATS: BusinessStats = {
  total_views: 140,
  total_bookmarks: 12,
  total_comments: 5,
  views_this_week: 38,
  views_last_week: 27,
};

export const useAnalyticsData = (businessId?: number, demoMode = false) => {
  const [dateRange, setDateRange] = useState('week');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [dailyData, setDailyData] = useState<DailyViewData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get days based on date range
  const getDaysForRange = (range: string): number => {
    switch (range) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 7;
    }
  };

  // Handle demo mode
  useEffect(() => {
    if (demoMode) {
      const days = getDaysForRange(dateRange);
      setStats(MOCK_STATS);
      setDailyData(generateMockData(days));
      setIsLoading(false);
      return;
    }
  }, [demoMode, dateRange]);

  // Fetch real analytics data
  useEffect(() => {
    if (demoMode) return;

    const fetchAnalytics = async () => {
      if (!businessId) {
        setIsLoading(false);
        return;
      }

      // Only show full loading on initial load, not on dateRange changes
      if (!stats) {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Fetch overall stats
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_business_stats', { p_business_id: businessId });

        if (statsError) {
          console.error('Error fetching stats:', statsError);
          setError('Failed to load analytics');
        } else if (statsData && statsData.length > 0) {
          setStats(statsData[0] as BusinessStats);
        }

        // Fetch daily view data
        const days = getDaysForRange(dateRange);
        const { data: analyticsData, error: analyticsError } = await supabase
          .rpc('get_business_analytics', { 
            p_business_id: businessId, 
            p_days: days 
          });

        if (analyticsError) {
          console.error('Error fetching analytics:', analyticsError);
        } else {
          setDailyData((analyticsData as DailyViewData[]) || []);
        }
      } catch (err) {
        console.error('Analytics fetch error:', err);
        setError('Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [businessId, dateRange]);

  // Transform daily data into engagement chart format
  const engagementData = useMemo((): EngagementDataPoint[] => {
    const days = getDaysForRange(dateRange);
    const data: EngagementDataPoint[] = [];
    
    // Create date range
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find matching data for this date
      const dayData = dailyData.find(d => d.view_date === dateStr);
      
      data.push({
        name: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        views: dayData?.view_count || 0,
        clicks: 0, // We don't track clicks yet
        bookmarks: 0, // Per-day bookmarks not tracked yet
      });
    }
    
    return data;
  }, [dailyData, dateRange]);

  // Calculate metrics from real data
  const metrics = useMemo(() => {
    const totalViews = stats?.total_views || 0;
    const totalBookmarks = stats?.total_bookmarks || 0;
    const totalComments = stats?.total_comments || 0;
    const viewsThisWeek = stats?.views_this_week || 0;
    const viewsLastWeek = stats?.views_last_week || 0;
    
    // Calculate trend (percentage change from last week)
    const viewsTrend = viewsLastWeek > 0 
      ? Math.round(((viewsThisWeek - viewsLastWeek) / viewsLastWeek) * 100)
      : viewsThisWeek > 0 ? 100 : 0;

    // Calculate rates (avoid division by zero)
    const bookmarkRate = totalViews > 0 
      ? ((totalBookmarks / totalViews) * 100).toFixed(1) 
      : '0.0';

    return {
      totalViews,
      totalClicks: 0, // Not tracked yet
      totalBookmarks,
      totalComments,
      clickRate: '0.0', // Not tracked yet
      bookmarkRate,
      viewsTrend,
    };
  }, [stats]);

  return {
    dateRange,
    setDateRange,
    engagementData,
    metrics,
    isLoading,
    error,
  };
};
