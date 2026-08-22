import React from 'react';
import { Link } from '@/lib/router-compat';
import { Mail, LifeBuoy } from 'lucide-react';
import avanteIcon72 from '@/assets/avante-icon-72.webp';
import avanteIcon144 from '@/assets/avante-icon-144.webp';

const NAVY = '#1A1F3C';

const Logo: React.FC = () => (
  <div className="flex items-center gap-2">
    <img
      src={avanteIcon72}
      srcSet={`${avanteIcon72} 72w, ${avanteIcon144} 144w`}
      sizes="36px"
      alt="Avante Maps logo"
      width={36}
      height={36}
      decoding="async"
      className="h-9 w-9 rounded-full object-contain filter brightness-0 invert"
    />
    <span className="font-bold text-lg text-white">Avante Maps</span>
  </div>
);

const Footer: React.FC = () => {
  return (
    <footer className="w-full text-white" style={{ backgroundColor: NAVY }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-center sm:text-left">
          {/* Column 1: Logo + Tagline */}
          <div className="flex flex-col items-center sm:items-start">
            <Logo />
            <p className="mt-3 text-white/70 text-sm">Discover. Connect. Transact.</p>
          </div>

          {/* Column 2: Company Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-white/90">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wide text-white/90">
              Support
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link
                  to="/contact"
                  className="hover:text-white inline-flex items-center gap-2 transition-colors"
                >
                  <Mail className="h-4 w-4" /> Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-white inline-flex items-center gap-2 transition-colors"
                >
                  <LifeBuoy className="h-4 w-4" /> Help & Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 sm:mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/60">
          © {new Date().getFullYear()} Avante Maps. Built on the Pi Network.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
