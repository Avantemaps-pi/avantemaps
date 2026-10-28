
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';
import { FormValues, businessTypes } from '../formSchema';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STEP_LABEL_CLASS } from './stepLabel';

interface BusinessTypeSelectorProps {
  disabled?: boolean | undefined;
  /** 'chips': every type as a toggle chip (registration steps); default is the dropdown */
  variant?: 'dropdown' | 'chips';
  /** Registration steps: sentence-case label in the steps' label style */
  stepLabels?: boolean | undefined;
}

// The map's category chip look: 36px pill, ::after extends the hit area to 44px
const chipClass = (pressed: boolean) => cn(
  'relative flex h-9 items-center whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition-colors',
  "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:pointer-events-none disabled:opacity-50',
  pressed
    ? 'bg-primary text-primary-foreground border-primary'
    : 'bg-surface-float text-foreground border-input hover:bg-accent hover:text-accent-foreground'
);

const BusinessTypeSelector: React.FC<BusinessTypeSelectorProps> = ({ disabled, variant = 'dropdown', stepLabels }) => {
  const form = useFormContext<FormValues>();
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [customBusinessType, setCustomBusinessType] = React.useState<string>('');
  const [showCustomInput, setShowCustomInput] = React.useState<boolean>(false);
  
  return (
    <FormField
      control={form.control}
      name="businessTypes"
      render={({ field }) => {
        // Ensure field.value is always an array
        const values = Array.isArray(field.value) ? field.value : [];
        
        // Sync internal state with form values when component mounts or field.value changes
        React.useEffect(() => {
          setSelectedTypes(values);
        }, [values]);
        
        const handleSelectType = (type: string) => {
          // If "Other" is selected, show custom input instead of adding "Other"
          if (type === "Other") {
            setShowCustomInput(true);
            return;
          }
          
          // Don't add if already selected
          if (selectedTypes.includes(type)) return;
          
          const newSelectedTypes = [...selectedTypes, type];
          setSelectedTypes(newSelectedTypes);
          field.onChange(newSelectedTypes);
        };
        
        const handleRemoveType = (typeToRemove: string) => {
          const newSelectedTypes = selectedTypes.filter(
            (type) => type !== typeToRemove
          );
          setSelectedTypes(newSelectedTypes);
          field.onChange(newSelectedTypes);
          
          // Hide custom input if all custom types are removed
          const hasCustomTypes = newSelectedTypes.some(t => !businessTypes.includes(t));
          if (!hasCustomTypes) {
            setShowCustomInput(false);
            setCustomBusinessType('');
          }
        };
        
        const handleAddCustomType = () => {
          const trimmedType = customBusinessType.trim();
          
          // Validate input
          if (!trimmedType) return;
          if (selectedTypes.includes(trimmedType)) {
            setCustomBusinessType('');
            return;
          }
          
          const newSelectedTypes = [...selectedTypes, trimmedType];
          setSelectedTypes(newSelectedTypes);
          field.onChange(newSelectedTypes);
          setCustomBusinessType('');
        };
        
        return (
          <FormItem className="flex flex-col">
            <FormLabel className={stepLabels ? STEP_LABEL_CLASS : "text-base mb-1.5 whitespace-nowrap"}>{stepLabels ? 'Business type (select all that apply) *' : 'Business type (Select all that apply) *'}</FormLabel>
            <div className="space-y-4">
              {variant === 'chips' ? (
                <>
                  {/* Every type as a toggle chip; "Other" opens the custom type input */}
                  <FormControl>
                    <div role="group" aria-label="Business type" className="flex flex-wrap gap-2">
                      {businessTypes.map((type, index) => {
                        const pressed = type === "Other" ? showCustomInput : selectedTypes.includes(type);
                        return (
                          <button
                            key={type}
                            ref={index === 0 ? field.ref : undefined}
                            type="button"
                            aria-pressed={pressed}
                            disabled={disabled}
                            onClick={() => {
                              if (type === "Other") setShowCustomInput(!showCustomInput);
                              else if (pressed) handleRemoveType(type);
                              else handleSelectType(type);
                            }}
                            className={chipClass(pressed)}
                          >
                            {type}
                          </button>
                        );
                      })}
                      {selectedTypes.filter((type) => !businessTypes.includes(type)).map((type) => (
                        <button
                          key={type}
                          type="button"
                          aria-pressed={true}
                          disabled={disabled}
                          onClick={() => handleRemoveType(type)}
                          className={chipClass(true)}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </FormControl>
                </>
              ) : (
                <>
                  {/* Selected types badges */}
                  {selectedTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTypes.map((type) => (
                        <Badge
                          key={type}
                          variant="secondary"
                          className="px-2 py-1.5 gap-1 text-sm"
                        >
                          {type}
                          {!disabled && (
                            <button
                              type="button"
                              className="ml-1 rounded-full outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-primary"
                              onClick={() => handleRemoveType(type)}
                              disabled={disabled}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Type selector dropdown */}
                  <FormControl>
                    <Select onValueChange={handleSelectType} disabled={disabled ?? false}>
                      <SelectTrigger 
                        className={cn(
                          "w-full",
                          !selectedTypes.length && "text-muted-foreground"
                        )}
                      >
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        align="start"
                        className="max-h-[300px] overflow-y-auto z-50 bg-background"
                        sideOffset={4}
                      >
                        {businessTypes
                          .filter(type => !selectedTypes.includes(type))
                          .map((type) => (
                            <SelectItem
                              key={type}
                              value={type}
                              disabled={selectedTypes.includes(type) || (disabled ?? false)}
                            >
                              {type}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                </>
              )}
              
              {/* Custom business type input */}
              {showCustomInput && (
                <div className="flex gap-2">
                  <Input
                    id="customBusinessType"
                    type="text"
                    placeholder="Enter your business type"
                    value={customBusinessType}
                    onChange={(e) => setCustomBusinessType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomType();
                      }
                    }}
                    disabled={disabled}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomType}
                    disabled={!customBusinessType.trim() || disabled}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default BusinessTypeSelector;
