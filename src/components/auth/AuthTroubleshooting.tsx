import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { isPiNetworkAvailable } from '@/utils/piNetwork';

interface AuthTroubleshootingProps {
  isVisible: boolean;
}

const AuthTroubleshooting: React.FC<AuthTroubleshootingProps> = ({ isVisible }) => {
  const [checks, setChecks] = React.useState({
    piSdkAvailable: false,
    onlineStatus: true,
    piBrowser: false,
  });

  React.useEffect(() => {
    if (!isVisible) return;

    const performChecks = () => {
      const sdkAvailable = isPiNetworkAvailable();
      const online = navigator.onLine;
      const inPiBrowser = sdkAvailable || window.location.hostname.includes('pi');

      setChecks({
        piSdkAvailable: sdkAvailable,
        onlineStatus: online,
        piBrowser: inPiBrowser,
      });
    };

    performChecks();
    const interval = setInterval(performChecks, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const StatusIcon = ({ status }: { status: boolean | 'loading' }) => {
    if (status === 'loading') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Card className="w-full mt-4 border-yellow-200 dark:border-yellow-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <CardTitle className="text-lg">Troubleshooting</CardTitle>
        </div>
        <CardDescription>
          Checking your environment for Pi Network authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Internet Connection</span>
          <div className="flex items-center gap-2">
            <StatusIcon status={checks.onlineStatus} />
            <Badge variant={checks.onlineStatus ? 'default' : 'destructive'}>
              {checks.onlineStatus ? 'Connected' : 'Offline'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Pi Network SDK</span>
          <div className="flex items-center gap-2">
            <StatusIcon status={checks.piSdkAvailable} />
            <Badge variant={checks.piSdkAvailable ? 'default' : 'destructive'}>
              {checks.piSdkAvailable ? 'Available' : 'Not Found'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Pi Browser</span>
          <div className="flex items-center gap-2">
            <StatusIcon status={checks.piBrowser} />
            <Badge variant={checks.piBrowser ? 'default' : 'secondary'}>
              {checks.piBrowser ? 'Detected' : 'Unknown'}
            </Badge>
          </div>
        </div>

        {!checks.piSdkAvailable && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Tip:</strong> Avante Maps requires the official Pi Browser app for authentication.
              Please open this app in the Pi Browser to continue.
            </p>
          </div>
        )}

        {!checks.onlineStatus && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-800 dark:text-red-300">
              <strong>Connection Issue:</strong> You appear to be offline. Please check your
              internet connection and try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthTroubleshooting;
