
import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, MapPin, Users, Globe, User, Loader2, Bookmark, ChevronDown, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/context/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessData } from '@/hooks/useBusinessData';
import LoginDialog from '@/components/auth/LoginDialog';
import avanteIcon72 from '@/assets/avante-icon-72.webp';
import avanteIcon144 from '@/assets/avante-icon-144.webp';

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
  const [showLogin, setShowLogin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const { places = [], isLoading: placesLoading } = useBusinessData();
  const [restrictedPlace, setRestrictedPlace] = useState<{ id: string; name: string } | null>(null);
  const dismissCountRef = useRef(0);
  const lastDismissedAtRef = useRef<number | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleLoginWithPi = async () => {
    setLoginLoading(true);
    try {
      await login();
    } catch {
      // User cancelled or error
    } finally {
      setLoginLoading(false);
      setShowLogin(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-1 bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowLogin(true)} className="rounded-full">
            <User className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <img
            src={avanteIcon72}
            srcSet={`${avanteIcon72} 72w, ${avanteIcon144} 144w`}
            sizes="36px"
            alt="Avante Maps logo"
            width={36}
            height={36}
            decoding="async"
            fetchPriority="high"
            className="h-9 w-9 rounded-full object-contain"
          />
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
              onMarkerClick={(placeId) => {
                const p = places.find((pl) => pl.id === placeId);
                setRestrictedPlace(p ? { id: p.id, name: p.name } : { id: placeId, name: 'this business' });
              }}
              isLoading={placesLoading}
              suppressOverlay
            />
          </Suspense>
        </div>
        {/* Search Bar + Hero text overlaid on map */}
        <div className="relative z-10 px-4 pt-2 pointer-events-none space-y-2">
          <div className="max-w-2xl mx-auto w-full">
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-background/90 backdrop-blur-sm border border-border text-muted-foreground text-sm md:text-base text-left shadow-sm pointer-events-auto">
              <Search className="h-4 w-4 flex-shrink-0" />
              <span>Search for businesses nearby...</span>
            </div>
          </div>
          <h6 className="text-xs md:text-sm font-medium text-foreground text-center drop-shadow-sm">
            Discover, Explore, and Connect with Businesses Nearby!
          </h6>
        </div>
        {/* Scroll Indicator */}
        <div className="absolute bottom-44 md:bottom-52 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none">
          <span className="text-xs text-foreground/80 font-medium drop-shadow-sm">Scroll to explore</span>
          <div className="animate-bounce">
            <ChevronDown className="h-5 w-5 text-primary" />
          </div>
        </div>
        {/* Inline login CTA when a restricted marker is clicked */}
        {restrictedPlace && (
          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto px-4 pb-4">
            <Card className="max-w-2xl mx-auto p-4 border border-border bg-card/95 backdrop-blur-md shadow-lg rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{restrictedPlace.name}</h3>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    Sign in with Pi Network to view full business details.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setShowLogin(true)}
                      className="h-8 gap-1.5"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Sign in
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRestrictedPlace(null)}
                      className="h-8"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setRestrictedPlace(null)}
                  className="p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </Card>
          </div>
        )}
        {/* Feature cards anchored to bottom of map */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-auto">
          <div className="bg-gradient-to-t from-background via-background/95 to-transparent pt-16 pb-4 px-4">
            <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3 md:gap-4">
              {[
                { icon: Store, title: 'Discover Businesses', desc: 'Find local shops, services, and attractions', color: 'text-amber-500' },
                { icon: Bookmark, title: 'Save & Share', desc: 'Bookmark favorite spots and share them with friends', color: 'text-violet-500' },
              ].map(({ icon: Icon, title, desc, color }) => (
                <Card
                  key={title}
                  className="p-4 flex flex-col items-start gap-2 border border-border bg-card/95 backdrop-blur-sm shadow-md rounded-2xl"
                >
                  <div className="p-2 rounded-xl bg-muted/60">
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 pt-2 pb-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg md:text-2xl font-bold text-foreground text-center mb-4">Our Growing Community</h2>
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {[
              { icon: Store, value: stats.business_count, label: 'Businesses' },
              { icon: Users, value: stats.user_count, label: 'Users' },
              { icon: Globe, value: stats.country_count || 1, label: 'Countries' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 p-3 md:p-5 rounded-xl bg-card border border-border">
                <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary mb-1" />
                <span className="text-xl md:text-3xl font-bold text-foreground">{value}+</span>
                <span className="text-xs md:text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg md:text-2xl font-bold text-foreground mb-2">The Problem</h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Pi holders struggle to find real places to spend their cryptocurrency. Businesses that accept Pi have no easy way to get discovered by potential customers.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="px-4 py-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg md:text-2xl font-bold text-foreground mb-4">How Avante Maps Helps</h2>
          <div className="space-y-4 md:grid md:grid-cols-3 md:gap-6 md:space-y-0">
            {[
              { title: 'For Pi Holders', desc: 'Find businesses near you that accept Pi. Explore, review, and save your favorites.' },
              { title: 'For Business Owners', desc: 'Register your business for free. Get discovered by Pi users in your area.' },
              { title: 'For the Community', desc: 'Build a thriving Pi economy by connecting buyers and sellers in one place.' },
            ].map(({ title, desc }) => (
              <div key={title} className="flex gap-3 items-start md:flex-col md:items-start">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-foreground">{title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-8">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-lg md:text-2xl font-bold text-foreground">Ready to Get Started?</h2>
          <p className="text-sm md:text-base text-muted-foreground">Join the growing Pi business community today.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleLoginWithPi} size="lg" className="rounded-full w-full sm:w-auto">
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

      <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </div>
  );
};

export default LandingPage;
