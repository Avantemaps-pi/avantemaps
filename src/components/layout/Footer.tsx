
import React from 'react';
import { Link } from 'react-router-dom';
import { legalItems } from '@/components/layout/sidebar/sidebarConfig';
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-border bg-background/95 backdrop-blur-sm py-4 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <Link 
            to="/pricing" 
            className="hover:text-primary transition-colors font-medium"
          >
            Pricing
          </Link>
          <span className="hidden sm:inline text-border">|</span>
          {legalItems.map((item, index) => (
            <React.Fragment key={item.to}>
              <Link 
                to={item.to} 
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
              {index < legalItems.length - 1 && (
                <span className="hidden sm:inline text-border">|</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <a 
            href="mailto:support@avantemaps.com" 
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Mail className="h-3 w-3" />
            <span className="hidden sm:inline">support@avantemaps.com</span>
          </a>
          <a 
            href="tel:+27624767535" 
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Phone className="h-3 w-3" />
            <span className="hidden sm:inline">(062) 476-7535</span>
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Avante Maps
        </p>
      </div>
    </footer>
  );
};

export default Footer;
