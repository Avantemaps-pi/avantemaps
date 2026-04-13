
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Coins, Search, MapPin, Users, Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessData } from '@/hooks/useBusinessData';

const LeafletMap = lazy(() => import('@/components/map/LeafletMap'));

interface LandingStats {
  business_count: number;
  user_count: number;
  country_count: number;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [stats, setStats] = useState<LandingStats>({ business_count: 0, user_count: 0, country_count: 0 });
  const { places = [], isLoading: placesLoading } = useBusinessData();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await supabase.rpc('get_landing_stats');
        if (data) setStats(data as unknown as LandingStats);
      } catch (e) {
        console.error('Failed to fetch landing stats:', e);
      }
    };
    fetchStats();
  }, []);

  const handleExplore = async () => {
    try {
      await login();
    } catch {
      // User cancelled or error
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-1 bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <Button variant="ghost" size="icon" onClick={handleExplore} className="rounded-full">
          <User className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg text-foreground">Avante Maps</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Map + Search overlay + Feature cards */}
      <section className="relative w-full h-[calc(100vh-56px)]">
        <div className="absolute inset-0">
          <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
            <LeafletMap
              places={places}
              selectedPlaceId={null}
              onMarkerClick={() => {}}
              isLoading={placesLoading}
            />
          </Suspense>
        </div>
        {/* Search Bar + Hero text overlaid on map */}
        <div className="relative z-10 px-4 pt-2 pointer-events-none space-y-2">
          <div
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-background/90 backdrop-blur-sm border border-border text-muted-foreground text-sm text-left shadow-sm pointer-events-auto"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span>Search for businesses nearby...</span>
          </div>
          <h6 className="text-xs font-medium text-foreground text-center drop-shadow-sm">
            Discover, Explore, and Connect with Businesses Nearby!
          </h6>
        </div>
        {/* Feature cards at bottom of map */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-auto">
          <div className="bg-gradient-to-t from-background/80 to-transparent pt-8 pb-3 px-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Store, title: 'Discover Businesses', desc: 'Find Pi-accepting shops nearby', color: 'text-primary' },
                { icon: Coins, title: 'Earn Pi Rewards', desc: 'Transact with Pi cryptocurrency', color: 'text-amber-500' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <Card
                  key={title}
                  className="p-3 flex flex-col items-start gap-1.5 border border-border bg-card/95 backdrop-blur-sm shadow-md"
                >
                  <div className={`p-1.5 rounded-lg bg-muted/60`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground">{title}</h3>
                  <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-6 bg-muted/30">
        <h2 className="text-lg font-bold text-foreground text-center mb-4">Our Growing Community</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Store, value: stats.business_count, label: 'Businesses' },
            { icon: Users, value: stats.user_count, label: 'Users' },
            { icon: Globe, value: stats.country_count || 1, label: 'Countries' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-card border border-border">
              <Icon className="h-5 w-5 text-primary mb-1" />
              <span className="text-xl font-bold text-foreground">{value}+</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Problem Section */}
      <section className="px-4 py-6">
        <h2 className="text-lg font-bold text-foreground mb-2">The Problem</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Pi holders struggle to find real places to spend their cryptocurrency. Businesses that accept Pi have no easy way to get discovered by potential customers.
        </p>
      </section>

      {/* Solution Section */}
      <section className="px-4 py-6 bg-muted/30">
        <h2 className="text-lg font-bold text-foreground mb-4">How Avante Maps Helps</h2>
        <div className="space-y-4">
          {[
            { title: 'For Pi Holders', desc: 'Find businesses near you that accept Pi. Explore, review, and save your favorites.' },
            { title: 'For Business Owners', desc: 'Register your business for free. Get discovered by Pi users in your area.' },
            { title: 'For the Community', desc: 'Build a thriving Pi economy by connecting buyers and sellers in one place.' },
          ].map(({ title, desc }) => (
            <div key={title} className="flex gap-3 items-start">
              <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-8">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-bold text-foreground">Ready to Get Started?</h2>
          <p className="text-sm text-muted-foreground">Join the growing Pi business community today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleExplore} size="lg" className="rounded-full w-full sm:w-auto">
              Explore the Map
            </Button>
            <Button onClick={() => navigate('/registration')} variant="outline" size="lg" className="rounded-full w-full sm:w-auto">
              Register Your Business
            </Button>
          </div>
        </div>
      </section>

      {/* Footer spacing */}
      <div className="h-8" />
    </div>
  );
};

export default LandingPage;
