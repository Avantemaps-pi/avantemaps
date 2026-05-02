
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Monitor, Sun, Moon, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

interface AppPreferencesProps {
  colorScheme: 'system' | 'light' | 'dark';
  onColorSchemeChange: (scheme: 'system' | 'light' | 'dark') => void;
}

const AppPreferences = ({
  colorScheme,
  onColorSchemeChange,
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
      </CardContent>
    </Card>
  );
};

export default AppPreferences;
