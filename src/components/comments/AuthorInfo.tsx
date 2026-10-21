
import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AuthorInfoProps {
  author: {
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  timestamp: string;
}

const AuthorInfo: React.FC<AuthorInfoProps> = ({ author, timestamp }) => {
  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'some time ago';
    }
  };

  return (
    <div className="flex items-center">
      <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
        <img 
          src={author.avatar} 
          alt={author.name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
      </div>
      <div>
        <div className="flex items-center">
          <span className="font-medium">{author.name}</span>
          {author.isVerified && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CheckCircle className="h-3.5 w-3.5 ml-1 text-primary" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Verified Pi Network User</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          <span>{formatTimestamp(timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default AuthorInfo;
