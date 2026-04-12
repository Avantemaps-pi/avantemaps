
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Coins, Bookmark, Search, MapPin, Users, Globe, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import mapPreview from '@/assets/map-preview.jpg';
import BottomNavBar from '@/components/layout/BottomNavBar';

interface LandingStats {
  business_count: number;
  user_count: number;
  country_count: number;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [stats, setStats] = useState<LandingStats>({ business_count: 0, user_count: 0, country_count: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await supabase.rpc('get_landing_stats');
        if (data) setStats(data as LandingStats);
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg text-foreground">Avante Maps</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleExplore} className="rounded-full">
          <User className="h-5 w-5 text-muted-foreground" />
        </Button>
      </header>

      {/* Search Bar */}
      <div className="px-4 pt-2 pb-4">
        <button
          onClick={handleExplore}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/60 border border-border text-muted-foreground text-sm text-left transition-colors hover:bg-muted"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span>Search for businesses nearby...</span>
        </button>
      </div>

      {/* Hero Section */}
      <section className="px-4 pb-2">
        <h1 className="text-2xl font-bold text-foreground leading-tight">
          Discover, Explore, and Connect with Businesses Nearby!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Find local businesses that accept Pi cryptocurrency. Save your favorites, earn rewards, and support your community.
        </p>
      </section>

      {/* Map Preview */}
      <section className="px-4 py-4">
        <div
          className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-accent/10 border border-border cursor-pointer group"
          onClick={handleExplore}
        >
          <img
            src={mapPreview}
            alt="Map preview showing businesses near you"
            className="w-full h-48 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            width={800}
            height={512}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end justify-center pb-4">
            <Button size="sm" className="rounded-full gap-1 shadow-md">
              Explore the Map <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-4 pb-4">
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { icon: Store, title: 'Discover Businesses', desc: 'Find Pi-accepting shops nearby', color: 'text-primary' },
            { icon: Coins, title: 'Earn Pi Rewards', desc: 'Transact with Pi cryptocurrency', color: 'text-amber-500' },
            { icon: Bookmark, title: 'Save & Share', desc: 'Bookmark and share your finds', color: 'text-emerald-500' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <Card
              key={title}
              className="flex-shrink-0 w-40 p-4 flex flex-col items-start gap-2 border border-border bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={handleExplore}
            >
              <div className={`p-2 rounded-lg bg-muted/60`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
            </Card>
          ))}
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

      {/* Footer spacing for bottom nav */}
      <div className="h-20" />

      <BottomNavBar />
    </div>
  );
};

export default LandingPage;
