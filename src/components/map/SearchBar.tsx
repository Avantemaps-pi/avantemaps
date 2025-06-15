
import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import debounce from 'lodash/debounce';

interface SearchBarProps {
  onSearch?: (searchTerm: string) => void;
  placeholders?: string[];
  cycleInterval?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholders = [
    "Search for business name",
    "Search by location",
    "Search by keywords (e.g., coffee, haircut)",
    "Search by description"
  ],
  cycleInterval = 3000,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  
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
      setCurrentPlaceholderIndex((prevIndex) => 
        (prevIndex + 1) % placeholders.length
      );
    }, cycleInterval);
    
    return () => clearInterval(intervalId);
  }, [placeholders.length, cycleInterval]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchTerm.trim()) {
      onSearch(searchTerm);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full">
      <Input
        type="text"
        placeholder={placeholders[currentPlaceholderIndex]}
        value={searchTerm}
        onChange={handleInputChange}
        className="w-full pl-10 h-10 bg-white/90 backdrop-blur-sm shadow-md transition-all duration-300 border-gray-200"
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-500" />
      </div>
    </form>
  );
};

export default SearchBar;
