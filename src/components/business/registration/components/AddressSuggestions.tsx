
import React from 'react';

interface AddressSuggestion {
  display_name: string;
  lat: number;
  lon: number;
  address: {
    house_number: string;
    road: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
}

interface AddressSuggestionsProps {
  suggestions: AddressSuggestion[];
  isVisible: boolean;
  onSuggestionClick: (suggestion: AddressSuggestion) => void;
}

const AddressSuggestions: React.FC<AddressSuggestionsProps> = ({
  suggestions,
  isVisible,
  onSuggestionClick
}) => {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-auto">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
          onClick={() => onSuggestionClick(suggestion)}
        >
          <span className="text-muted-foreground mt-0.5 flex-shrink-0">
            📍
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {suggestion.address.house_number} {suggestion.address.road}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {suggestion.address.city}, {suggestion.address.state}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AddressSuggestions;
export type { AddressSuggestion };
