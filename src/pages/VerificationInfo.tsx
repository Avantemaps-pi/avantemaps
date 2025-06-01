
import React, { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Info, ArrowLeft, Shield, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

const VerificationInfo = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const navigate = useNavigate();

  return (
    <AppLayout title="Verification & Certification">
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <p className="text-muted-foreground mt-1">
              Understanding the processes for verifying and certifying your Pi business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <CardTitle className="text-xl">Verification</CardTitle>
                </div>
                <CardDescription>
                  Proof of Business Existence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Verification confirms that your business actually exists and operates as described.
                </p>
                
                <h3 className="text-base font-medium mb-2">Requirements:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                  <li>Minimum rating of (4.0/5)</li>
                  <li>A minimum of 100+ Pi transactions</li>
                  <li>A minimum of 10+ wallets transacted with</li>
                  <li>Contact information verification</li>
                  <li>Active business operations</li>
                </ul>

                <h3 className="text-base font-medium mb-2">Benefits:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Increased visibility in search results</li>
                  <li>"Verified" badge on your business listing</li>
                  <li>User trust and credibility</li>
                </ul>
              </CardContent>
            </Card>

            <div className="relative">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-6 w-6 text-blue-500" />
                    <CardTitle className="text-xl">Certification</CardTitle>
                  </div>
                  <CardDescription>
                    Proof of Business Legitimacy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Certification confirms your business meets advanced standards of legitimacy, quality, and customer satisfaction.
                  </p>
                  
                  <h3 className="text-base font-medium mb-2">Requirements:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-4">
                    <li>Completed verification process</li>
                    <li>Minimum 3 months of active Pi transactions</li>
                    <li>Video of business operations</li>
                    <li>Images of services / products offered</li>
                    <li>Compliance with Pi Network policies</li>
                    <li>Regular business activity updates</li>
                    <li>Subscription member</li>
                  </ul>

                  <h3 className="text-base font-medium mb-2">Benefits:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Premium placement in Pi business directory</li>
                    <li>"Certified" badge with enhanced visibility</li>
                    <li>Access to business analytics tools</li>
                    <li>Featured in Avante Maps communications</li>
                    <li>Advanced transaction analytics</li>
                    <li>Eligibility for Avante Maps promotions</li>
                  </ul>
                </CardContent>
              </Card>
              
              {/* Grey transparent overlay with lock icon */}
              <div className="absolute inset-0 bg-gray-800/50 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center z-10">
                <Lock className="h-12 w-12 text-white mb-3 opacity-80" />
                <p className="text-white font-medium text-lg">Complete Verification First</p>
                <p className="text-white/80 text-sm mt-1 max-w-xs text-center">
                  Certification is available after your business is verified
                </p>
                
                {/* Coming Soon Badge */}
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-2 rounded-bl-lg rounded-tr-lg font-bold shadow-md z-20 transform rotate-0">
                  COMING SOON
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <Alert variant="default">
              <Info className="h-4 w-4" />
              <AlertTitle>Application Process</AlertTitle>
              <AlertDescription>
                Once you've registered your business, navigate to the "<strong>My Business</strong>" page, select the business you wish to verify, and click the "<strong>Request</strong>" button to start the verification process. Certification is available to businesses that successfully complete the verification and fulfill the additional requirements.
              </AlertDescription>
            </Alert>

            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">Verification Timeline</AlertTitle>
              <AlertDescription className="text-blue-600">
                The verification process typically takes 24 - 72 hours from submission of Request.
              </AlertDescription>
            </Alert>

            <Alert variant="default" className="bg-green-50 border-green-200">
              <Shield className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700">Certification Timeline</AlertTitle>
              <AlertDescription className="text-green-600">
                The certification process typically takes 15-30 days and includes an on-site or virtual inspection.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex justify-center gap-4">
            <Button asChild variant="outline">
              <Link to="/registered-business">My Businesses</Link>
            </Button>
            <Button asChild>
              <Link to="/registration">Register a Business</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default VerificationInfo;
