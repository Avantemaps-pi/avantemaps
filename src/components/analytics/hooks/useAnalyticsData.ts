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
    // Generate hourly data for full 24h range
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
    // Generate daily data for each day in the range
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      // Use smooth base with slight variation for natural-looking curves
      const base = 5 + Math.round(Math.sin(i * 0.3) * 3 + Math.random() * 3);
      data.push({
        view_date: date.toISOString().split('T')[0] ?? '',
        view_count: Math.max(0, base),
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
  const [dateRange, setDateRange] = useState(() => {
    try {
      return localStorage.getItem('analytics_dateRange') || 'week';
    } catch {
      return 'week';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('analytics_dateRange', dateRange);
    } catch {}
  }, [dateRange]);
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
      const isHourly = dateRange === 'day';
      const days = getDaysForRange(dateRange);
      setStats(MOCK_STATS);
      setDailyData(generateMockData(days, isHourly));
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

  // Transform daily data into engagement chart format with consistent intervals
  const engagementData = useMemo((): EngagementDataPoint[] => {
    const days = getDaysForRange(dateRange);
    const isHourly = dateRange === 'day';
    const data: EngagementDataPoint[] = [];
    
    if (isHourly) {
      // 24h → every 2 hours = 12 points for smooth curve
      for (let i = 22; i >= 0; i -= 2) {
        const date = new Date();
        date.setHours(date.getHours() - i, 0, 0, 0);
        const hourStr = date.toISOString().slice(0, 13);
        const nextHourStr = new Date(date.getTime() + 3600000).toISOString().slice(0, 13);
        
        const hourData = dailyData.filter(d => 
          d.view_date.slice(0, 13) === hourStr || d.view_date.slice(0, 13) === nextHourStr
        );
        const totalViews = hourData.reduce((sum, d) => sum + d.view_count, 0);
        
        data.push({
          name: date.toLocaleTimeString('en-US', { 
            hour: 'numeric',
            hour12: true,
          }),
          views: totalViews,
          clicks: 0,
          bookmarks: 0,
        });
      }
    } else {
      // Determine aggregation step to keep ~7-12 points
      let step: number;
      if (days <= 7) {
        step = 1; // week: 7 daily points
      } else if (days <= 30) {
        step = 3; // month: ~10 points (every 3 days)
      } else if (days <= 90) {
        step = 7; // quarter: ~13 points (weekly)
      } else {
        step = 30; // year: ~12 points (monthly)
      }

      for (let i = days - 1; i >= 0; i -= step) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - i);
        
        // Aggregate views over the step window
        let totalViews = 0;
        for (let j = 0; j < step && (i - j) >= 0; j++) {
          const d = new Date();
          d.setDate(d.getDate() - (i - j));
          const dateStr = d.toISOString().split('T')[0];
          const dayData = dailyData.find(dd => dd.view_date === dateStr);
          totalViews += dayData?.view_count || 0;
        }
        
        const label = step >= 30
          ? endDate.toLocaleDateString('en-US', { month: 'short' })
          : endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        data.push({
          name: label,
          views: totalViews,
          clicks: 0,
          bookmarks: 0,
        });
      }
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
