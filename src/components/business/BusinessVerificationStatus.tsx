
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Shield, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BusinessVerificationStatusProps {
  isCertification?: boolean;
}

const BusinessVerificationStatus = ({ isCertification = false }: BusinessVerificationStatusProps) => {
  const navigate = useNavigate();

  const handleRequestClick = () => {
    // Navigate to Communicon page with verification trigger
    navigate('/communicon', { 
      state: { 
        triggerVerification: true,
        verificationType: isCertification ? 'certification' : 'verification'
      } 
    });
  };

  return (
    <>
      {!isCertification ? (
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              <span className="text-sm font-medium">Verification Status</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs ml-2"
              onClick={handleRequestClick}
            >
              Request
            </Button>
          </div>
          <div className="mt-1 flex flex-col pl-7">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1 self-start mb-1 w-32 justify-center">
              <AlertTriangle className="h-3 w-3" />
              Not Verified
            </Badge>
            <Button variant="link" size="sm" asChild className="pl-0 h-auto text-blue-600 self-start">
              <Link to="/verification-info">
                <Info className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">View Requirements</span>
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-500" />
              <span className="text-sm font-medium">Certification Status</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs ml-2 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Request
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Not available yet</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="mt-1 pl-7">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1 self-start mb-1 w-32 justify-center">
              <AlertTriangle className="h-3 w-3" />
              Not Certified
            </Badge>
            <Button variant="link" size="sm" asChild className="pl-0 h-auto text-blue-600 self-start">
              <Link to="/verification-info">
                <Info className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">View Requirements</span>
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default BusinessVerificationStatus;
