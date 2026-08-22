
import React, { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';

const MAX_WORD_COUNT = 150;
const MIN_WORD_COUNT = 10;

interface BusinessDescriptionFieldProps {
  disabled?: boolean | undefined;
}

const BusinessDescriptionField: React.FC<BusinessDescriptionFieldProps> = ({ disabled }) => {
  const form = useFormContext<FormValues>();
  const [wordCount, setWordCount] = useState(0);
  
  // Calculate word count when description changes
  useEffect(() => {
    const description = form.watch('businessDescription') || '';
    const words = description.trim().split(/\s+/).filter(Boolean);
    setWordCount(words.length);
  }, [form.watch('businessDescription')]);
  
  // Handle text input and enforce word count limit
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(Boolean);
    
    if (words.length <= MAX_WORD_COUNT) {
      form.setValue('businessDescription', text);
    } else {
      // If exceeding limit, truncate to max allowed words
      const limitedText = words.slice(0, MAX_WORD_COUNT).join(' ');
      form.setValue('businessDescription', limitedText);
    }
  };
  
  return (
    <FormField
      control={form.control}
      name="businessDescription"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base mb-1.5">Business Description *</FormLabel>
          <FormControl>
            <Textarea 
              id="businessDescription"
              placeholder="Tell us about your business..." 
              className="min-h-[120px] resize-none text-base md:text-sm"
              {...field}
              onChange={handleTextChange}
              disabled={disabled}
            />
          </FormControl>
          {wordCount < MIN_WORD_COUNT && (
            <FormDescription className="flex justify-end text-xs mt-1">
              {wordCount}/{MAX_WORD_COUNT} words
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default BusinessDescriptionField;
