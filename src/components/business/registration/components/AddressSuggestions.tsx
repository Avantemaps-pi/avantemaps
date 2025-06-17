
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
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 border-b border-gray-100 last:border-b-0 text-sm transition-colors duration-150"
          onClick={() => onSuggestionClick(suggestion)}
          onMouseDown={(e) => e.preventDefault()} // Prevent input blur
        >
          <div className="font-medium text-gray-900">
            {suggestion.address.house_number && suggestion.address.road 
              ? `${suggestion.address.house_number} ${suggestion.address.road}`
              : suggestion.address.road || suggestion.display_name.split(',')[0]
            }
          </div>
          <div className="text-gray-600 text-xs">
            {suggestion.address.city}, {suggestion.address.state} {suggestion.address.postcode}
          </div>
        </button>
      ))}
    </div>
  );
};

export default AddressSuggestions;
export type { AddressSuggestion };
