import React, { useState } from 'react';
import { MapPin, Bookmark, MessageCircle, Star, Mail, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth/useAuth';
import LoginDialog from '@/components/auth/LoginDialog';
import avanteIcon72 from '@/assets/avante-icon-72.webp';
import avanteIcon144 from '@/assets/avante-icon-144.webp';

const NAVY = '#1A1F3C';
const GOLD = '#C9A84C';

const features = [
  { icon: MapPin, title: 'Interactive Map', desc: 'Find businesses near you on a live map, filtered by category.' },
  { icon: Bookmark, title: 'Save Favourites', desc: 'Bookmark businesses you love and revisit them anytime.' },
  { icon: MessageCircle, title: 'Message Directly', desc: 'Send messages to businesses and get replies in real time.' },
  { icon: Star, title: 'Trusted Reviews', desc: 'Read and leave reviews to help the Pi community choose wisely.' },
];

const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handlePiLogin = async () => {
    setLoginLoading(true);
    try {
      await login();
    } catch {
      setShowLogin(true);
    } finally {
      setLoginLoading(false);
    }
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  const Logo = ({ light = false }: { light?: boolean }) => (
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
      <span className={`font-bold text-lg ${light ? 'text-white' : 'text-[#1A1F3C]'}`}>Avante Maps</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Sticky Nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-black/5 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <Button
            variant="ghost"
            onClick={() => setShowLogin(true)}
            className="text-[#1A1F3C] hover:text-[#1A1F3C] hover:bg-[#1A1F3C]/5"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: NAVY }}
      >
        {/* Grid pattern overlay */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Radial accent */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 80% 20%, rgba(201,168,76,0.18), transparent 55%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
          <div className="max-w-2xl text-center md:text-left mx-auto md:mx-0">
            <div className="flex justify-center md:justify-start mb-5 sm:mb-6">
              <Logo light />
            </div>
            <h1 className="font-bold text-white leading-tight text-[28px] sm:text-4xl md:text-5xl">
              Discover Pi-Powered Businesses Near You
            </h1>
            <p className="mt-3 sm:mt-4 text-white/70 leading-relaxed text-[15px] sm:text-base md:text-lg">
              Avante Maps connects you with local businesses that accept Pi. Explore, save, and message them — all in one place.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center md:justify-start max-w-xs sm:max-w-none mx-auto md:mx-0">
              <Button
                onClick={handlePiLogin}
                disabled={loginLoading}
                className="w-full sm:w-auto font-semibold hover:brightness-95"
                style={{ backgroundColor: GOLD, color: NAVY }}
                size="lg"
              >
                {loginLoading ? 'Connecting…' : 'Get Started with Pi'}
              </Button>
              <Button
                onClick={scrollToFeatures}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto bg-transparent border-white/60 text-white hover:bg-white/10 hover:text-white"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-bold text-xl sm:text-2xl md:text-3xl"
            style={{ color: NAVY }}
          >
            Everything you need to find Pi businesses
          </h2>
          <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-4 sm:p-5 rounded-2xl border border-black/5 bg-white shadow-sm flex gap-3 sm:gap-4 items-start"
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12"
                  style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: GOLD }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base" style={{ color: NAVY }}>{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PI CALLOUT */}
      <section className="py-12 sm:py-16 px-4 sm:px-6" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="max-w-2xl mx-auto text-center">
          <div
            className="mx-auto flex items-center justify-center rounded-full mb-4 sm:mb-5 w-14 h-14"
            style={{ backgroundColor: GOLD }}
          >
            <span className="text-2xl font-bold" style={{ color: NAVY }}>π</span>
          </div>
          <h2 className="font-bold text-xl sm:text-2xl md:text-3xl" style={{ color: NAVY }}>
            Built for the Pi Network Community
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed text-sm sm:text-base">
            Avante Maps is designed exclusively for Pi Network users. Verified Pi users get full access to messaging, saving, and business registration — all powered by Pi.
          </p>
          <Button
            onClick={handlePiLogin}
            disabled={loginLoading}
            className="mt-6 w-full sm:w-auto font-semibold hover:brightness-95"
            style={{ backgroundColor: GOLD, color: NAVY }}
            size="lg"
          >
            {loginLoading ? 'Connecting…' : 'Join with Pi'}
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 sm:py-12 px-4 sm:px-6 text-white" style={{ backgroundColor: NAVY }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="flex flex-col items-center sm:items-start">
            <Logo light />
            <p className="mt-3 text-white/70 text-sm">Discover. Connect. Transact.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-white/90">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-white">Terms of Service</Link></li>
              <li><Link to="/cookie-policy" className="hover:text-white">Cookie Policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-white/90">Support</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link to="/contact" className="hover:text-white inline-flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Contact Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white inline-flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4" /> Help & Support
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 sm:mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/60">
          © 2026 Avante Maps. Built on the Pi Network.
        </div>
      </footer>

      <LoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </div>
  );
};

export default LandingPage;
