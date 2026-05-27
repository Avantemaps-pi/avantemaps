
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/context/auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getInitials } from '@/lib/getInitials';

const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarFallback className="text-xl">{getInitials(user?.username)}</AvatarFallback>
          </Avatar>
          
          <h2 className="text-xl font-semibold mb-2">{user?.username || 'Guest User'}</h2>
          
          <div className="space-y-3 w-full max-w-md">
            <div className="flex items-center">
              <span className="text-gray-600 w-40">Email:</span>
              <span className="text-gray-800">******</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-gray-600 w-40">Joined:</span>
              <span className="text-gray-800">*****</span>
            </div>
            
            <div className="flex items-center">
              <span className="text-gray-600 w-40">Preferred Payment:</span>
              <span className="text-gray-800">Pi Coin</span>
            </div>
          </div>
          
          <div className="w-full mt-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="w-full flex items-center justify-center cursor-not-allowed opacity-70">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link Fireside Forum
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Not available</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;
