import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';
import debounce from 'lodash/debounce';
import { useLocationIQAutocomplete, GeocodingOptions } from '@/hooks/useLocationIQAutocomplete';
import { cn } from '@/lib/utils';

export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface SearchBarProps {
  onSearch?: (searchTerm: string) => void;
  onPlaceSelect?: (place: { name: string; lat: number; lng: number }) => void;
  placeholders?: string[];
  cycleInterval?: number;
  enableAutocomplete?: boolean;
  mapBounds?: MapBounds;
  countrycodes?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onPlaceSelect,
  placeholders = [
    "Search for business name",
    "Search by location",
    "Search by keywords (e.g., coffee, haircut)",
    "Search by description"
  ],
  cycleInterval = 3000,
  enableAutocomplete = true,
  mapBounds,
  countrycodes
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { predictions, getSuggestions, getPlaceDetails, clearSuggestions } = useLocationIQAutocomplete();

  // Debounced autocomplete function with map bounds for location bias
  const debouncedAutocomplete = useCallback(
    debounce((value: string, bounds?: MapBounds, codes?: string) => {
      const options: GeocodingOptions = {};
      
      // Add viewbox for location bias if map bounds available
      if (bounds) {
        options.viewbox = {
          minLon: bounds.minLng,
          minLat: bounds.minLat,
          maxLon: bounds.maxLng,
          maxLat: bounds.maxLat
        };
      }
      
      // Add country codes if provided
      if (codes) {
        options.countrycodes = codes;
      }
      
      getSuggestions(value, Object.keys(options).length > 0 ? options : undefined);
    }, 300),
    [getSuggestions]
  );

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      if (onSearch) {
        onSearch(value);
      }
    }, 300),
    [onSearch]
  );

  // Effect to cycle through placeholders
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentPlaceholderIndex(prevIndex => (prevIndex + 1) % placeholders.length);
    }, cycleInterval);
    return () => clearInterval(intervalId);
  }, [placeholders.length, cycleInterval]);

  // Show/hide dropdown based on predictions
  useEffect(() => {
    setShowDropdown(predictions.length > 0);
  }, [predictions]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchTerm.trim()) {
      onSearch(searchTerm);
      setShowDropdown(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1);

    if (value.trim()) {
      if (enableAutocomplete) {
        debouncedAutocomplete(value, mapBounds, countrycodes);
      }
      debouncedSearch(value);
    } else {
      clearSuggestions();
      setShowDropdown(false);
    }
  };

  const handlePredictionClick = async (placeId: string, description: string) => {
    setSearchTerm(description);
    setShowDropdown(false);
    setSelectedIndex(-1);

    const placeDetails = await getPlaceDetails(placeId);
    if (placeDetails && onPlaceSelect) {
      onPlaceSelect({
        name: placeDetails.name,
        lat: placeDetails.lat,
        lng: placeDetails.lng,
      });
    }

    if (onSearch) {
      onSearch(description);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < predictions.length) {
          const prediction = predictions[selectedIndex];
          handlePredictionClick(prediction.placeId, prediction.description);
        } else if (searchTerm.trim()) {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <form onSubmit={handleSearch}>
        <Input
          ref={inputRef}
          id="searchBarInput"
          name="searchBarInput"
          type="text"
          placeholder={placeholders[currentPlaceholderIndex]}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 h-10 bg-white/90 backdrop-blur-sm shadow-md transition-all duration-300 border-gray-200 px-[40px] mx-0"
          autoComplete="off"
        />
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-500" />
        </div>
      </form>

      {enableAutocomplete && showDropdown && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto z-[2000]">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => handlePredictionClick(prediction.placeId, prediction.description)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-3 border-b border-border last:border-b-0",
                selectedIndex === index && "bg-accent"
              )}
            >
              <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {prediction.mainText}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {prediction.secondaryText}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
