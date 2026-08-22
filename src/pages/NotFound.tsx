
import React from 'react';
import { Link } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { MapPin, Home } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="bg-avante-blue/10 p-6 rounded-full">
            <MapPin className="h-16 w-16 text-avante-blue" />
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-avante-blue to-avante-purple bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-2xl font-semibold">Location Not Found</h2>
        <p className="text-muted-foreground">
          We couldn't find the page you're looking for. The location may have moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild className="bg-avante-blue hover:bg-avante-blue/90">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
