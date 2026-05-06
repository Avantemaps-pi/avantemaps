
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Monitor, Sun, Moon, MapPin, Crosshair } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface AppPreferencesProps {
  colorScheme: 'system' | 'light' | 'dark';
  onColorSchemeChange: (scheme: 'system' | 'light' | 'dark') => void;
  useLocation: boolean;
  onUseLocationChange: (value: boolean) => void;
  useDeviceGps: boolean;
  onUseDeviceGpsChange: (value: boolean) => void;
}

const AppPreferences = ({
  colorScheme,
  onColorSchemeChange,
  useLocation,
  onUseLocationChange,
  useDeviceGps,
  onUseDeviceGpsChange,
}: AppPreferencesProps) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>App Preferences</CardTitle>
        <CardDescription>Customize your Avante Maps experience.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="space-y-0.5">
            <Label htmlFor="color-scheme">Color Scheme</Label>
            <p className="text-muted-foreground text-sm">Choose between light, dark, or system theme.</p>
          </div>
          <Select value={colorScheme} onValueChange={onColorSchemeChange} name="color-scheme">
            <SelectTrigger id="color-scheme" className="w-full sm:w-[180px] mt-2 sm:mt-0">
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

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="use-location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Use my location
            </Label>
            <p className="text-muted-foreground text-sm">
              Focus the map on your approximate (IP-based) location when you sign in.
            </p>
          </div>
          <Switch
            id="use-location"
            checked={useLocation}
            onCheckedChange={onUseLocationChange}
            aria-label="Use my location"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="use-device-gps" className="flex items-center gap-2">
              <Crosshair className="h-4 w-4" />
              Use device GPS (precise)
            </Label>
            <p className="text-muted-foreground text-sm">
              Opt in to use your device's GPS for accurate location. Your browser will ask for permission. Coordinates stay on your device — they aren't sent to our servers.
            </p>
          </div>
          <Switch
            id="use-device-gps"
            checked={useDeviceGps}
            onCheckedChange={onUseDeviceGpsChange}
            aria-label="Use device GPS"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AppPreferences;
