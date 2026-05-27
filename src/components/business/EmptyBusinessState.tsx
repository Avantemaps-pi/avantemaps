
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building } from 'lucide-react';

const EmptyBusinessState = () => {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <Building className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No businesses registered yet</h3>
        <p className="text-muted-foreground">Register your first business to appear on the Avante Maps directory.</p>
      </CardContent>
    </Card>
  );
};

export default EmptyBusinessState;
