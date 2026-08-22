
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from '@/lib/router-compat';

const SubscriptionPrompt: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="px-4 py-8 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <Card className="w-full text-center p-4">
        <CardContent className="pt-6 flex flex-col items-center space-y-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-primary"
            >
              <path d="M6 18h8"></path>
              <path d="M3 22h18"></path>
              <path d="M14 22a7 7 0 1 0 0-14h-1"></path>
              <path d="M9 14h2"></path>
              <path d="M9 12a2 2 0 0 1 0-4h1"></path>
              <path d="M7 8h1"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Analytics Requires Organization Subscription</h2>
          <p className="text-muted-foreground">
            Access detailed insights about your business performance with our Organization subscription plan.
          </p>
          <Button 
            className="mt-4" 
            size="lg"
            onClick={() => navigate('/pricing')}
          >
            Upgrade Your Subscription
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionPrompt;
