import { useState, useEffect, useRef } from 'react';
import { MapPin, Wifi, WifiOff } from 'lucide-react';

interface LocationTrackerProps {
  riderId: string;
  isActive: boolean; // Only track when rider is "available" or "on_delivery"
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
}

export function LocationTracker({ riderId, isActive, onLocationUpdate }: LocationTrackerProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownCoordsRef = useRef<GeolocationCoordinates | null>(null);

  // Send location to backend
  const updateLocationToBackend = async (coords: GeolocationCoordinates) => {
    try {
      const token = localStorage.getItem('rider_token'); // Rider auth token
      
      if (!token) {
        console.error('No rider token found');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/riders/${riderId}/location`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        console.error('Failed to update location:', response.status);
      } else {
        console.log('Location updated successfully:', coords.latitude, coords.longitude);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  // Handle successful position update
  const handleSuccess = (position: GeolocationPosition) => {
    const { coords } = position;
    
    setLocation({
      lat: coords.latitude,
      lng: coords.longitude,
    });
    setAccuracy(coords.accuracy);
    setError(null);
    setIsTracking(true);

    // Cache the latest coordinates
    lastKnownCoordsRef.current = coords;

    // Notify parent component
    if (onLocationUpdate) {
      onLocationUpdate({
        lat: coords.latitude,
        lng: coords.longitude,
      });
    }

    // Update backend immediately on position change
    updateLocationToBackend(coords);
  };

  // Handle geolocation errors
  const handleError = (err: GeolocationPositionError) => {
    console.error('Geolocation error:', err);
    
    let message = '';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access in your browser.';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable.';
        break;
      case err.TIMEOUT:
        message = 'Location request timed out.';
        break;
      default:
        message = 'An unknown error occurred.';
    }
    
    setError(message);
    setIsTracking(false);

    // Stop tracking if permission denied
    if (err.code === err.PERMISSION_DENIED) {
      stopTracking();
    }
  };

  // Start tracking location
  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    console.log('Starting location tracking...');

    // High accuracy options for GPS
    const options: PositionOptions = {
      enableHighAccuracy: true, // Use GPS if available
      timeout: 10000,           // Wait 10 seconds max
      maximumAge: 0,            // Don't use cached position
    };

    // Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    watchIdRef.current = watchId;

    // Also send updates every 10 seconds (even if position doesn't change much)
    updateIntervalRef.current = setInterval(() => {
      if (lastKnownCoordsRef.current) {
        updateLocationToBackend(lastKnownCoordsRef.current);
      }
    }, 10000); // 10 seconds
  };

  // Stop tracking
  const stopTracking = () => {
    console.log('Stopping location tracking...');
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setIsTracking(false);
    lastKnownCoordsRef.current = null;
  };

  // Auto start/stop tracking based on isActive prop
  useEffect(() => {
    if (isActive && riderId) {
      startTracking();
    } else {
      stopTracking();
    }

    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [isActive, riderId]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className={`h-5 w-5 ${isTracking ? 'text-green-500' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-800">Location Tracking</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {isTracking ? (
            <>
              <Wifi className="h-4 w-4 text-green-500 animate-pulse" />
              <span className="text-sm text-green-600 font-medium">Active</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-400">Inactive</span>
            </>
          )}
        </div>
      </div>

      {/* Location Data */}
      {location && (
        <div className="bg-gray-50 rounded-lg p-3 mb-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Latitude:</span>
              <p className="font-mono font-semibold">{location.lat.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-gray-600">Longitude:</span>
              <p className="font-mono font-semibold">{location.lng.toFixed(6)}</p>
            </div>
            {accuracy && (
              <div className="col-span-2">
                <span className="text-gray-600">Accuracy:</span>
                <p className="font-semibold">±{accuracy.toFixed(1)} meters</p>
              </div>
            )}
          </div>
          {lastUpdate && (
            <div className="mt-2 text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Inactive Warning */}
      {!isActive && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-700">
            Set your status to "Available" to start tracking your location
          </p>
        </div>
      )}

      {/* Tracking Info */}
      {isTracking && (
        <div className="text-xs text-gray-500 mt-2">
          <p>🛰️ GPS tracking active</p>
          <p>📡 Updating backend every 10 seconds</p>
        </div>
      )}
    </div>
  );
}

