
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Link as LinkIcon } from 'lucide-react';
import { useAuth } from '@/context/auth';

const UserProfileCard: React.FC = () => {
  const { user } = useAuth();
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src="/placeholder.svg" alt="User" />
            <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
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
            <Button variant="outline" className="w-full flex items-center justify-center bg-gray-800 text-white hover:bg-gray-700">
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Fireside Forum
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileCard;
