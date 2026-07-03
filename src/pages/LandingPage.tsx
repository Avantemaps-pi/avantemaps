import React, { useState } from 'react';
import { MapPin, Bookmark, MessageCircle, Star, Mail, LifeBuoy, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth/useAuth';
import LoginDialog from '@/components/auth/LoginDialog';
import avanteIcon72 from '@/assets/avante-icon-72.webp';
import avanteIcon144 from '@/assets/avante-icon-144.webp';
import mapPreview from '@/assets/map-preview.jpg';
import piNetworkLogo from '@/assets/pi-network-logo.png';

const NAVY = '#1E3A8A';
const GOLD = '#2563EB';

const features = [
  { icon: MapPin, title: 'Interactive Map', desc: "See exactly where Pi-accepting businesses are, filtered by what you're looking for." },
  { icon: Bookmark, title: 'Save Favourites', desc: 'Save the ones you love. Come back to them whenever you need them.' },
  { icon: MessageCircle, title: 'Message Directly', desc: 'Message a business directly — no middleman, no waiting on hold.' },
  { icon: Star, title: 'Trusted Reviews', desc: 'Leave honest reviews. Help the next person in the Pi community make a good call.' },
];

const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handlePiLogin = async () => {
    if (typeof window === 'undefined' || !(window as any).Pi) {
      setShowLogin(true);
      return;
    }
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
      <div className={light ? 'bg-white rounded-full p-1 flex items-center justify-center' : ''}>
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
      </div>
      <span className={`font-bold text-lg ${light ? 'text-white' : 'text-[#1E3A8A]'}`}>Avante Maps</span>
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
            className="text-[#1E3A8A] hover:text-[#1E3A8A] hover:bg-[#1E3A8A]/5"
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
              'radial-gradient(circle at 80% 20%, rgba(37,99,235,0.18), transparent 55%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 max-w-2xl text-center md:text-left mx-auto md:mx-0">
              <div className="hidden md:flex justify-center md:justify-start mb-5 sm:mb-6">
                <Logo light />
              </div>
              <h1 className="font-bold text-white leading-tight text-[28px] sm:text-4xl md:text-5xl">
                A Business Directory Built By One Person, For The Pi Community
              </h1>
              <p className="mt-3 sm:mt-4 text-white/70 leading-relaxed text-[15px] sm:text-base md:text-lg">
                I'm building the map I wish existed when I started using Pi — a real place to find, message, and support businesses that accept it. No corporate backing. Just one developer and a community that showed up.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center md:justify-start max-w-xs sm:max-w-none mx-auto md:mx-0">
                <Button
                  onClick={handlePiLogin}
                  disabled={loginLoading}
                  className="w-full sm:w-auto font-semibold hover:brightness-95"
                  style={{ backgroundColor: GOLD, color: '#FFFFFF' }}
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
            <div className="hidden md:block flex-1">
              <img
                src={mapPreview}
                alt="Avante Maps preview"
                className="w-full rounded-xl shadow-2xl rotate-1"
              />
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
            What Avante Maps does today
          </h2>
          <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-4 sm:p-5 rounded-2xl border border-black/5 bg-white shadow-sm flex gap-3 sm:gap-4 items-start"
              >
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 w-12 h-12"
                  style={{ backgroundColor: 'rgba(37,99,235,0.15)' }}
                >
                  <Icon className="h-6 w-6" style={{ color: GOLD }} />
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

      {/* BUILT FOR MORE THAN JUST DISCOVERY */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-blue-50">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-center font-bold text-xl sm:text-2xl md:text-3xl"
            style={{ color: NAVY }}
          >
            Built for more than just discovery
          </h2>
          <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="p-4 sm:p-5 rounded-2xl border border-black/5 bg-white shadow-sm flex gap-3 sm:gap-4 items-start">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 w-12 h-12"
                style={{ backgroundColor: 'rgba(37,99,235,0.15)' }}
              >
                <MessageCircle className="h-6 w-6" style={{ color: GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base" style={{ color: NAVY }}>Direct messaging</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">
                  Talk to a business before you visit. No app-switching, no waiting.
                </p>
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-2xl border border-black/5 bg-white shadow-sm flex gap-3 sm:gap-4 items-start">
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 w-12 h-12"
                style={{ backgroundColor: 'rgba(37,99,235,0.15)' }}
              >
                <BarChart3 className="h-6 w-6" style={{ color: GOLD }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base" style={{ color: NAVY }}>Business analytics</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-snug">
                  Business owners see who's finding them and how — real data, not guesswork.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PI CALLOUT */}
      <section className="py-12 sm:py-16 px-4 sm:px-6" style={{ backgroundColor: '#F5F5F5' }}>
        <div className="max-w-2xl mx-auto text-center">
          <img
            src={piNetworkLogo}
            alt="Pi Network"
            className="mx-auto mb-4 sm:mb-5 w-14 h-14 rounded-full object-contain"
            width={56}
            height={56}
          />
          <h2 className="font-bold text-xl sm:text-2xl md:text-3xl" style={{ color: NAVY }}>
            Made For Pi. Not Made By Pi.
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed text-sm sm:text-base">
            Avante Maps isn't an official Pi Network product — it's an independent app built by a KYC-verified Pi Network member, for the community I'm part of. Every business registration, message, and review here runs on Pi. And this is just the beginning of what I'm building toward.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center max-w-xs sm:max-w-none mx-auto">
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto font-semibold border-black/20 text-[#1E3A8A] hover:bg-black/5"
            >
              <Link to="/pricing">View pricing</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto font-semibold border-black/20 text-[#1E3A8A] hover:bg-black/5"
            >
              <Link to="/about">Learn about us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FOUNDER NOTE */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-6 sm:p-8">
            <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
              👋 Hi, I'm the person building this. There are already ways to find Pi businesses on a map — but none of them let you message a business directly, or give business owners real analytics on who's finding them. So I built Avante Maps to close that gap. It's early, it's solo, and it's growing. Thank you for being here at the start. — Founder, Avante Maps
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-10 sm:py-12 px-4 sm:px-6 text-white" style={{ backgroundColor: NAVY }}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-8 text-center sm:text-left">
          <div className="col-span-2 sm:col-span-1 flex flex-col items-center sm:items-start">
            <Logo light />
            <p className="mt-3 text-white/70 text-sm">Discover. Connect. Transact. — Built solo, one commit at a time.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-white/90">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
              <li><Link to="/cookies" className="hover:text-white">Cookie Policy</Link></li>
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
