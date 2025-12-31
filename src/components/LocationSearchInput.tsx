import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Search, Home, MapPinned } from 'lucide-react';

export interface LocationResult {
  lat: number;
  lng: number;
  address: string;
  displayName: string;
  houseAddress?: string;
  landmark?: string;
}

interface LocationSearchInputProps {
  value: string;
  onChange: (location: LocationResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  showAddressFields?: boolean; // Show house address and landmark fields
  houseAddress?: string;
  landmark?: string;
  onHouseAddressChange?: (value: string) => void;
  onLandmarkChange?: (value: string) => void;
}

// Google Places API types
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function LocationSearchInput({
  value,
  onChange,
  placeholder = "Search for a location...",
  label,
  required = false,
  error,
  showAddressFields = true,
  houseAddress = '',
  landmark = '',
  onHouseAddressChange,
  onLandmarkChange,
}: LocationSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(
    // Initialize with location if value is provided
    value ? { lat: 0, lng: 0, address: value, displayName: value } : null
  );
  const searchTimeoutRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  // Initialize Google Places API
  useEffect(() => {
    const initGooglePlaces = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        // Create a hidden div for PlacesService (it requires a map or div)
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyDiv);
      } else {
        // Retry after a delay if Google Maps not loaded yet
        setTimeout(initGooglePlaces, 500);
      }
    };

    initGooglePlaces();
  }, []);

  // Update search query when value prop changes (from profile load)
  useEffect(() => {
    setSearchQuery(value);
    if (value) {
      // Set selected location when value is provided (e.g., from profile)
      setSelectedLocation({
        lat: 0, // Coordinates will be set from parent
        lng: 0,
        address: value,
        displayName: value,
        houseAddress: houseAddress,
        landmark: landmark,
      });
    } else {
      setSelectedLocation(null);
    }
  }, [value, houseAddress, landmark]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for locations using Google Places Autocomplete
  const searchLocations = async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (!autocompleteServiceRef.current) {
      console.error('Google Places Autocomplete not initialized');
      return;
    }

    setIsLoading(true);

    try {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' }, // Restrict to India
          types: ['establishment', 'geocode'], // Include businesses and addresses
        },
        (predictions, status) => {
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setSuggestions([]);
            setShowSuggestions(true);
          } else {
            console.error('Places API error:', status);
            setSuggestions([]);
          }
        }
      );
    } catch (error) {
      console.error('Location search failed:', error);
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, 300); // Reduced to 300ms for faster response
  };

  const handleSelectLocation = (prediction: PlacePrediction) => {
    if (!placesServiceRef.current) {
      console.error('Google Places Service not initialized');
      return;
    }

    setIsLoading(true);

    // Get place details to retrieve coordinates
    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'formatted_address', 'name', 'address_components'],
      },
      (place, status) => {
        setIsLoading(false);

        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry?.location) {
          const location: LocationResult = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            address: place.formatted_address || prediction.description,
            displayName: prediction.description,
            houseAddress: houseAddress,
            landmark: landmark,
          };

          setSearchQuery(prediction.description);
          setSelectedLocation(location);
          onChange(location);
          setShowSuggestions(false);
          setSuggestions([]);
        } else {
          console.error('Failed to get place details:', status);
          alert('Failed to get location details. Please try another location.');
        }
      }
    );
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Location Search */}
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          <div className="absolute right-4 bg-white top-1/2 -translate-y-1/2 text-gray-400">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={placeholder}
            className={`su-input left-3 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {suggestions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectLocation(prediction)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {prediction.structured_formatting.main_text}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showSuggestions && !isLoading && searchQuery.length >= 2 && suggestions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-500 text-center">
              No locations found. Try a different search term.
            </p>
          </div>
        )}
      </div>

      {/* Additional Address Fields */}
      {showAddressFields && selectedLocation && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 mb-3">{searchQuery}</p>

          {/* House/Shop Address */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Home className="h-4 w-4 text-gray-500" />
              House/Shop Address
            </label>
            <input
              type="text"
              value={houseAddress}
              onChange={(e) => onHouseAddressChange?.(e.target.value)}
              placeholder="e.g., Shop #123, Building Name, Floor 2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Specific shop/house number, building name, floor
            </p>
          </div>

          {/* Landmark */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <MapPinned className="h-4 w-4 text-gray-500" />
              Landmark
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => onLandmarkChange?.(e.target.value)}
              placeholder="e.g., Near Metro Station, Opposite Mall"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nearby landmark for easy identification
            </p>
          </div>

          {/* Coordinates Display */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              📍 Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </p>
          </div>
        </div>
      )}

      {/* Powered by Google */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="text-right">
          <img 
            src="https://developers.google.com/maps/documentation/images/powered_by_google_on_white.png" 
            alt="Powered by Google"
            className="inline-block h-4 opacity-70"
          />
        </div>
      )}
    </div>
  );
}
