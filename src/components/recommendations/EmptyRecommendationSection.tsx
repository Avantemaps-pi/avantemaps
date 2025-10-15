import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface EmptyRecommendationSectionProps {
  title: string;
  message: string;
  icon: LucideIcon;
}

const EmptyRecommendationSection: React.FC<EmptyRecommendationSectionProps> = ({ 
  title, 
  message, 
  icon: Icon 
}) => {
  return (
    <Card className="w-80 flex-none">
      <CardContent className="text-center py-12">
        <div className="p-3 bg-muted rounded-full inline-block mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h4 className="font-medium mb-2">{title}</h4>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
};

export default EmptyRecommendationSection;
