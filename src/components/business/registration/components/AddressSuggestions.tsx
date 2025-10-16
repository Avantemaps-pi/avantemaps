
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
    <div className="absolute z-50 w-full mt-2 bg-background border-2 border-primary/20 rounded-xl shadow-2xl max-h-80 overflow-auto backdrop-blur-sm">
      <div className="p-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            className="w-full px-4 py-3 text-left hover:bg-primary/10 rounded-lg transition-colors border-b border-border/50 last:border-b-0 group"
            onClick={() => onSuggestionClick(suggestion)}
          >
            <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-start gap-2">
              <span className="text-primary mt-0.5">📍</span>
              <span>
                {suggestion.address.house_number} {suggestion.address.road}
              </span>
            </div>
            <div className="text-muted-foreground text-sm mt-1 ml-6">
              {suggestion.address.city}, {suggestion.address.state} {suggestion.address.postcode}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AddressSuggestions;
export type { AddressSuggestion };
