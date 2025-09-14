
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useFormContext } from 'react-hook-form';
import { FormValues, daysOfWeek } from './formSchema';

interface HoursTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

const HoursTab: React.FC<HoursTabProps> = ({ onNext, onPrevious, disabled }) => {
  const form = useFormContext<FormValues>();

  return (
    <div className="w-full max-w-none">
      <Card className="material-card w-full">
        <CardHeader>
          <CardTitle className="text-xl">Trading Hours</CardTitle>
          <CardDescription>
            Let customers know when your business is open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-hidden">
            <div className="max-h-[450px] overflow-y-auto overflow-x-hidden">
              <div>
                <div className="grid grid-cols-[1fr_50px_1fr_1fr] items-center mb-2 font-medium text-sm">
                  <div className="truncate">Day</div>
                  <div className="text-center text-xs">Closed</div>
                  <div className="text-center text-xs">Opening</div>
                  <div className="text-center text-xs">Closing</div>
                </div>
                {daysOfWeek.map((day) => (
                  <div key={day.name} className="grid grid-cols-[1fr_50px_1fr_1fr] items-center min-w-0">
                    <div className="font-medium">{day.name}</div>
                    <FormField
                      control={form.control}
                      name={day.closed as keyof FormValues}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-center space-x-0 space-y-0 m-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value as boolean}
                              onCheckedChange={(checked) => {
                                field.onChange(checked === true);
                              }}
                              disabled={disabled}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={day.open as keyof FormValues}
                      render={({ field }) => (
                        <FormItem className="space-y-0 min-w-0">
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              disabled={form.watch(day.closed as keyof FormValues) === true || disabled}
                              className="w-full min-w-0 text-sm"
                              value={field.value as string}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={day.close as keyof FormValues}
                      render={({ field }) => (
                        <FormItem className="space-y-0 min-w-0">
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                              disabled={form.watch(day.closed as keyof FormValues) === true || disabled}
                              className="w-full min-w-0 text-sm"
                              value={field.value as string}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
            disabled={disabled}
          >
            Back
          </Button>
          <Button 
            type="button" 
            className="bg-primary hover:bg-primary/90"
            onClick={onNext}
            disabled={disabled}
          >
            Next
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default HoursTab;
