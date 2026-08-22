import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmptyMapState = () => {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none md:pl-[280px]">
      <Card className="w-[90%] max-w-md pointer-events-auto bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 shadow-lg">
        <CardContent className="text-center py-12 px-6">
          <div className="p-4 bg-muted rounded-full inline-block mb-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Businesses Found</h3>
          <p className="text-muted-foreground mb-6">
            There are no businesses registered yet. Be the first to add your business to the map!
          </p>
          <Button onClick={() => navigate('/registration')}>
            Register Your Business
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmptyMapState;
