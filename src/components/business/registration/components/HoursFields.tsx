import React from 'react';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useFormContext } from 'react-hook-form';
import { FormValues, daysOfWeek } from '../formSchema';

interface HoursFieldsProps {
  disabled?: boolean | undefined;
}

const HoursFields: React.FC<HoursFieldsProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(2.5rem,auto)_auto_1fr_1fr] md:grid-cols-[1fr_auto_1fr_1fr] gap-y-0 mb-2 font-medium text-sm">
        <div className="min-w-[2.5rem] pr-0 md:pr-3">Day</div>
        <div className="text-center w-auto flex flex-col items-center pr-[20px] md:pr-2">
          <span className="mb-1">Closed</span>
        </div>
        <div className="text-center min-w-0 pr-1">Opening</div>
        <div className="text-center min-w-0">Closing</div>
      </div>
      {daysOfWeek.map((day) => (
        <div key={day.name} className="grid grid-cols-[minmax(2.5rem,auto)_auto_1fr_1fr] md:grid-cols-[1fr_auto_1fr_1fr] gap-y-0 items-center">
          <div className="font-medium text-sm min-w-[2.5rem] pr-0 md:pr-3">
            <span className="md:hidden">{day.short}</span>
            <span className="hidden md:inline">{day.name}</span>
          </div>
          
          <FormField
            control={form.control}
            name={day.closed as keyof FormValues}
            render={({ field }) => (
              <FormItem className="flex items-center justify-center space-x-0 space-y-0 m-0 p-0 pr-[20px] md:pr-2">
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
              <FormItem>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    disabled={form.watch(day.closed as keyof FormValues) === true || disabled}
                    className="w-full ml-0 pr-1"
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
              <FormItem>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    disabled={form.watch(day.closed as keyof FormValues) === true || disabled}
                    className="w-full"
                    value={field.value as string}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      ))}
    </div>
  );
};

export default HoursFields;
