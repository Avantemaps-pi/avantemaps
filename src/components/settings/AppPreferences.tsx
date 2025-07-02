
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Shield, ExternalLink, Monitor, Sun, Moon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AppPreferencesProps {
  notifications: boolean;
  setNotifications: (enabled: boolean) => void;
  isDarkMode: boolean;
  colorScheme: 'system' | 'light' | 'dark';
  onColorSchemeChange: (scheme: 'system' | 'light' | 'dark') => void;
  onSaveSettings: () => void;
}

const AppPreferences = ({
  notifications,
  setNotifications,
  isDarkMode,
  colorScheme,
  onColorSchemeChange,
  onSaveSettings
}: AppPreferencesProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>App Preferences</CardTitle>
        <CardDescription>Customize your Avante Maps experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Push Notifications</Label>
              <p className="text-muted-foreground text-sm">Receive notifications about new Pi-accepting businesses.</p>
            </div>
            <Switch 
              id="notifications" 
              checked={notifications}
              onCheckedChange={setNotifications}
              className="mt-2 sm:mt-0"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-4">
            <div className="space-y-0.5">
              <Label htmlFor="color-scheme">Color Scheme</Label>
              <p className="text-muted-foreground text-sm">Choose between light, dark, or system theme.</p>
            </div>
            <Select value={colorScheme} onValueChange={onColorSchemeChange}>
              <SelectTrigger className="w-full sm:w-[180px] mt-2 sm:mt-0">
                <SelectValue placeholder="Select color scheme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">
                  <div className="flex items-center">
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System (Default)</span>
                  </div>
                </SelectItem>
                <SelectItem value="light">
                  <div className="flex items-center">
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center">
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Preferences Button moved above Business Verification Requirements */}
        <div className="pt-4 flex justify-start">
          <Button onClick={onSaveSettings}>Save Preferences</Button>
        </div>
        
        <div className="pt-4 text-left">
          <h3 className="font-medium text-left">Business Verification Requirements</h3>
          <p className="text-sm text-muted-foreground mt-1 text-left">As a Business Owner, you need to complete these steps to get verified:</p>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-md w-full overflow-hidden">
          <div className="h-60 w-full">
            <ScrollArea className="h-full w-full pr-0" orientation="both">
              <div className="pr-4 min-w-[300px]">
                <div className="flex items-start text-left">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="w-full text-left">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-blue-800 dark:text-blue-300 text-left">Verification Process</h4>
                    </div>
                    <ul className="mt-2 space-y-3 text-sm text-left">
                      <li className="flex items-start text-left">
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 mt-0.5 mr-2">1</Badge>
                        <div className="text-left">
                          <p className="font-medium text-left">Submit all required business information</p>
                          <p className="text-muted-foreground text-left">Complete all required business details</p>
                        </div>
                      </li>
                      <li className="flex items-start text-left">
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 mt-0.5 mr-2">2</Badge>
                        <div className="text-left">
                          <p className="font-medium text-left">Request Verification</p>
                          <p className="text-muted-foreground text-left">Navigate to the "My Business" page, and click the "Request" button to begin the verification process, but only if you meet the requirements</p>
                        </div>
                      </li>
                      <li className="flex items-start text-left">
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 mt-0.5 mr-2">3</Badge>
                        <div className="text-left">
                          <p className="font-medium text-left">Get Verified Badge</p>
                          <p className="text-muted-foreground text-left">Once approved, your business will show as verified</p>
                          <div className="mt-2 text-left">
                            <Button variant="link" size="sm" asChild className="text-blue-700 dark:text-blue-400 p-0">
                              <Link to="/verification-info">
                                <span>View verification and certification details</span>
                                <ExternalLink className="h-3.5 w-3.5 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
      {/* Remove the Button from CardFooter */}
      <CardFooter>
      </CardFooter>
    </Card>
  );
};

export default AppPreferences;
