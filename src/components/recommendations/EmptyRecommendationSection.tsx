import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon, Store, ArrowRight } from 'lucide-react';

interface EmptyRecommendationSectionProps {
  title: string;
  message: string;
  icon: LucideIcon;
}

const EmptyRecommendationSection: React.FC<EmptyRecommendationSectionProps> = ({
  title,
  message,
  icon: Icon,
}) => {
  return (
    <Card className="w-80 flex-none border-dashed bg-gradient-to-br from-muted/40 to-background">
      <CardContent className="flex flex-col items-center text-center px-5 py-8">
        <div className="relative mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <span className="absolute -bottom-1 -right-1 p-1.5 bg-background border border-border rounded-full">
            <Store className="h-3 w-3 text-muted-foreground" />
          </span>
        </div>

        <h4 className="font-semibold mb-1.5">{title}</h4>
        <p className="text-sm text-muted-foreground mb-2">{message}</p>
        <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
          Be one of the first businesses featured here. Listings appear as
          merchants join Avante Maps and accept Pi.
        </p>

        <Button asChild size="sm" className="w-full">
          <Link to="/registration">
            List your business
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
        <Link
          to="/about"
          className="mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Learn more
        </Link>
      </CardContent>
    </Card>
  );
};

export default EmptyRecommendationSection;
