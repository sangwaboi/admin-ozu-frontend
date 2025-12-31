import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AdminLocation } from './index';
import { ShipmentAPI } from '../../lib/api';
import { cache, CacheKeys, CacheTTL } from '../../lib/cache';
import { getRidersSocket } from '../../lib/socket';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const adminIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC4wMjk0IDAgNiA0LjAyOTQzIDYgOUM2IDEzLjQ3MDYgMTUgMzAgMTUgMzBDMTUgMzAgMjQgMTMuNDcwNiAyNCA5QzI0IDQuMDI5NDMgMTkuOTcwNiAwIDE1IDBaIiBmaWxsPSIjM0I4MkY2Ii8+PGNpcmNsZSBjeD0iMTUiIGN5PSI5IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

const customerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC4wMjk0IDAgNiA0LjAyOTQzIDYgOUM2IDEzLjQ3MDYgMTUgMzAgMTUgMzBDMTUgMzAgMjQgMTMuNDcwNiAyNCA5QzI0IDQuMDI5NDMgMTkuOTcwNiAwIDE1IDBaIiBmaWxsPSIjRUYzNDM0Ii8+PGNpcmNsZSBjeD0iMTUiIGN5PSI5IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

const riderIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC4wMjk0IDAgNiA0LjAyOTQzIDYgOUM2IDEzLjQ3MDYgMTUgMzAgMTUgMzBDMTUgMzAgMjQgMTMuNDcwNiAyNCA5QzI0IDQuMDI5NDMgMTkuOTcwNiAwIDE1IDBaIiBmaWxsPSIjMTBCOTgxIi8+PGNpcmNsZSBjeD0iMTUiIGN5PSI5IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

interface LiveTrackingMapProps {
  adminLocation: AdminLocation | null;
  shipment: any;
}

function MapUpdater({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  
  return null;
}

function LiveTrackingMap({ adminLocation, shipment }: LiveTrackingMapProps) {
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number; updated_at?: string } | null>(null);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Load rider location from cache immediately (instant display)
  const loadCachedRiderLocation = useCallback((riderId: string | number) => {
    const cacheKey = CacheKeys.RIDER_LOCATION(riderId);
    const cached = cache.get<{ lat: number; lng: number; updated_at?: string }>(cacheKey);
    if (cached && cached.lat && cached.lng) {
      setRiderLocation(cached);
      setLastUpdate(cached.updated_at || null);
      return true; // Found in cache
    }
    return false; // Not in cache
  }, []);

  // Fetch rider location with caching
  const fetchRiderLocation = useCallback(async (riderId: string | number) => {
    try {
      const data = await ShipmentAPI.getRiderLocation(String(riderId));
      if (data && data.lat && data.lng) {
        setRiderLocation({ lat: data.lat, lng: data.lng, updated_at: data.updated_at });
        setLastUpdate(data.updated_at || new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to fetch rider location:', error);
    }
  }, []);

  useEffect(() => {
    // Parse customer location from link
    if (shipment?.customer?.locationLink) {
      const coords = parseLocationLink(shipment.customer.locationLink);
      if (coords) {
        setCustomerLocation(coords);
      }
    }

    // Load rider location (only after acceptance)
    if (shipment?.acceptedRiderId) {
      const riderId = shipment.acceptedRiderId;
      
      // Try cache first for instant display
      loadCachedRiderLocation(riderId);
      
      // Fetch fresh data immediately (even if cached)
      fetchRiderLocation(riderId);
      
      // Set up polling every 5 seconds
      const interval = setInterval(() => {
        fetchRiderLocation(riderId);
      }, 5000);

      // Set up WebSocket listener for real-time updates
      const socket = getRidersSocket();
      const handleRiderUpdate = (payload: any) => {
        if (payload.rider_id === String(riderId) || payload.id === String(riderId)) {
          if (payload.lat && payload.lng) {
            setRiderLocation({ 
              lat: payload.lat, 
              lng: payload.lng,
              updated_at: payload.updated_at || new Date().toISOString()
            });
            setLastUpdate(payload.updated_at || new Date().toISOString());
            
            // Update cache
            const cacheKey = CacheKeys.RIDER_LOCATION(riderId);
            cache.set(cacheKey, { 
              lat: payload.lat, 
              lng: payload.lng,
              updated_at: payload.updated_at 
            }, CacheTTL.RIDER_LOCATION);
          }
        }
      };

      socket.on('rider_update', handleRiderUpdate);

      return () => {
        clearInterval(interval);
        socket.off('rider_update', handleRiderUpdate);
      };
    } else {
      // No rider assigned yet
      setRiderLocation(null);
      setLastUpdate(null);
    }
  }, [shipment, loadCachedRiderLocation, fetchRiderLocation]);

  const parseLocationLink = (link: string): { lat: number; lng: number } | null => {
    try {
      // Parse Google Maps link: ?q=28.6139,77.2090
      const qMatch = link.match(/[?&]q=([0-9.-]+),([0-9.-]+)/);
      if (qMatch) {
        return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
      }

      // Parse coordinates directly: 28.6139,77.2090
      const coordMatch = link.match(/([0-9.-]+),\s*([0-9.-]+)/);
      if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse location link:', error);
      return null;
    }
  };

  const calculateBounds = (): L.LatLngBounds | null => {
    const points: [number, number][] = [];
    
    if (adminLocation) {
      points.push([adminLocation.latitude, adminLocation.longitude]);
    }
    if (customerLocation) {
      points.push([customerLocation.lat, customerLocation.lng]);
    }
    if (riderLocation) {
      points.push([riderLocation.lat, riderLocation.lng]);
    }

    if (points.length > 0) {
      return L.latLngBounds(points);
    }
    return null;
  };

  const defaultCenter: [number, number] = adminLocation
    ? [adminLocation.latitude, adminLocation.longitude]
    : [28.6139, 77.209];

  const bounds = calculateBounds();

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Live Tracking</h3>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">Admin (You)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-gray-600">Customer</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Rider</span>
          </div>
        </div>
      </div>

      <div className="h-96">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater bounds={bounds} />

          {/* Admin Marker */}
          {adminLocation && (
            <Marker
              position={[adminLocation.latitude, adminLocation.longitude]}
              icon={adminIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="text-blue-600">Your Shop</strong>
                  <p className="text-xs text-gray-600 mt-1">{adminLocation.address}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Customer Marker */}
          {customerLocation && (
            <Marker
              position={[customerLocation.lat, customerLocation.lng]}
              icon={customerIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="text-red-600">Customer</strong>
                  <p className="text-xs text-gray-600 mt-1">{shipment?.customer?.name}</p>
                  <p className="text-xs text-gray-500">{shipment?.customer?.landmark}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Rider Marker */}
          {riderLocation && (
            <Marker
              position={[riderLocation.lat, riderLocation.lng]}
              icon={riderIcon}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="text-green-600">Rider</strong>
                  <p className="text-xs text-gray-600 mt-1">On the way...</p>
                  {lastUpdate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {new Date(lastUpdate).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Line */}
          {adminLocation && customerLocation && riderLocation && (
            <Polyline
              positions={[
                [adminLocation.latitude, adminLocation.longitude],
                [riderLocation.lat, riderLocation.lng],
                [customerLocation.lat, customerLocation.lng],
              ]}
              color="#3B82F6"
              weight={3}
              opacity={0.7}
              dashArray="10, 5"
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default LiveTrackingMap;

