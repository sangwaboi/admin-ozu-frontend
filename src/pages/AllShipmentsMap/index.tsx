import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { RidersAPI, authenticatedFetch } from '../../lib/api';
import type { Rider } from '../../types/rider';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons: Shop, Bike, Green Pin
const shopIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC4wMjk0IDAgNiA0LjAyOTQzIDYgOUM2IDEzLjQ3MDYgMTUgMzAgMTUgMzBDMTUgMzAgMjQgMTMuNDcwNiAyNCA5QzI0IDQuMDI5NDMgMTkuOTcwNiAwIDE1IDBaIiBmaWxsPSIjM0I4MkY2Ii8+PHN2ZyB4PSI3IiB5PSI3IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTMgM0gxMlYxMkgzVjNaTTE1IDNIMjFWMTJIMTVWM1pNMyAxNUgxMlYyMUgzVjE1Wk0xNSAxNUgyMVYyMUgxNVYxNVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

const bikeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC4wMjk0IDAgNiA0LjAyOTQzIDYgOUM2IDEzLjQ3MDYgMTUgMzAgMTUgMzBDMTUgMzAgMjQgMTMuNDcwNiAyNCA5QzI0IDQuMDI5NDMgMTkuOTcwNiAwIDE1IDBaIiBmaWxsPSIjRkY2QjAwIi8+PHN2ZyB4PSI3IiB5PSI3IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTUgMTJIMTlWMTBINVYxMlpNMTIgN0MxMy42NTY5IDcgMTUgOC4zNDMxNSAxNSA5QzE1IDEwLjY1NjkgMTMuNjU2OSAxMiAxMiAxMkMxMC4zNDMxIDEyIDkgMTAuNjU2OSA5IDlDOSA3LjM0MzE1IDEwLjM0MzEgNiAxMiA2QzEzLjY1NjkgNiAxNSA3LjM0MzE1IDE1IDlDMTUgMTAuNjU2OSAxMy42NTY5IDEyIDEyIDEyQzEwLjM0MzEgMTIgOSAxMC42NTY5IDkgOVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

const customerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMC4wMjk0IDAgNiA0LjAyOTQzIDYgOUM2IDEzLjQ3MDYgMTUgMzAgMTUgMzBDMTUgMzAgMjQgMTMuNDcwNiAyNCA5QzI0IDQuMDI5NDMgMTkuOTcwNiAwIDE1IDBaIiBmaWxsPSIjMTBCOTgxIi8+PGNpcmNsZSBjeD0iMTUiIGN5PSI5IiByPSI0IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

interface Shipment {
  id: number;
  adminLocation: { latitude: number; longitude: number; address: string };
  adminMobile: string;
  customer: {
    name: string;
    mobile: string;
    locationLink: string;
    address: string;
    landmark: string;
    lat?: number;
    lng?: number;
  };
  deliveryPrice: number;
  status: string;
  acceptedRider?: {
    id: string;
    name: string;
    mobile: string;
    location: { lat: number; lng: number };
  };
  createdAt: string;
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

function AllShipmentsMap() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [allRiders, setAllRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [currentAdminMobile, setCurrentAdminMobile] = useState<string>('');
  const [currentAdminLocation, setCurrentAdminLocation] = useState<any>(null);

  // Load admin profile and address
  useEffect(() => {
    const loadAdminData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        // Get admin profile (mobile number)
        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('mobile')
          .eq('user_id', user.id)
          .single();

        if (!profile?.mobile) {
          alert('Please set your mobile number in Profile Settings first');
          navigate('/profile');
          return;
        }

        setCurrentAdminMobile(profile.mobile);

        // Get default admin address
        const { data: addresses } = await supabase
          .from('admin_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (addresses) {
          setCurrentAdminLocation({
            latitude: addresses.location_lat,
            longitude: addresses.location_lng,
            address: addresses.location_address,
          });
        }

        // Fetch shipments and riders
        await Promise.all([
          fetchAllShipments(profile.mobile),
          fetchAllRiders(),
        ]);
      } catch (error) {
        console.error('Error loading admin data:', error);
        alert('Failed to load profile. Please try again.');
        navigate('/profile');
      }
    };

    loadAdminData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (currentAdminMobile) {
        fetchAllShipments(currentAdminMobile);
        fetchAllRiders();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, navigate, currentAdminMobile]);

  // Fetch all live riders
  const fetchAllRiders = async () => {
    try {
      const riders = await RidersAPI.listLive();
      // Ensure we always have an array
      setAllRiders(Array.isArray(riders) ? riders : []);
    } catch (error: any) {
      console.error('Failed to fetch riders:', error);
      // If it's a CORS error, log it but don't break the app
      if (error?.message?.includes('CORS') || error?.message?.includes('Failed to fetch')) {
        console.warn('CORS error fetching riders - backend needs to allow authorization header');
      }
      setAllRiders([]); // Set empty array on error
    }
  };

  const fetchAllShipments = async (adminMobile: string) => {
    try {
      // Use authenticated fetch with proper error handling
      const response = await authenticatedFetch(
        `/shipments/active?adminMobile=${encodeURIComponent(adminMobile)}`
      );
      
      if (!response.ok) {
        if (response.status === 403) {
          console.error('403 Forbidden: Authentication failed or insufficient permissions');
          setLoading(false);
          return;
        }
        throw new Error(`${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle non-array responses (error objects)
      if (!Array.isArray(data)) {
        console.error('API returned non-array response:', data);
        setShipments([]);
        setLoading(false);
        return;
      }
      
      // Parse customer locations and fetch rider locations
      const shipmentsWithLocations = await Promise.all(
        data.map(async (shipment: any) => {
          const customerCoords = parseLocationLink(shipment.customer.locationLink);
          
          let riderLocation = null;
          if (shipment.acceptedRiderId) {
            try {
              const riderRes = await fetch(
                `${import.meta.env.VITE_BACKEND_BASE_URL}/riders/${shipment.acceptedRiderId}/location`
              );
              const riderData = await riderRes.json();
              riderLocation = {
                id: shipment.acceptedRiderId,
                name: riderData.name,
                mobile: riderData.mobile,
                location: { lat: riderData.lat, lng: riderData.lng },
              };
            } catch (error) {
              console.error('Failed to fetch rider location:', error);
            }
          }

          return {
            ...shipment,
            customer: {
              ...shipment.customer,
              lat: customerCoords?.lat,
              lng: customerCoords?.lng,
            },
            acceptedRider: riderLocation,
          };
        })
      );

      setShipments(shipmentsWithLocations);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
      setLoading(false);
    }
  };

  const parseLocationLink = (link: string): { lat: number; lng: number } | null => {
    try {
      const qMatch = link.match(/[?&]q=([0-9.-]+),([0-9.-]+)/);
      if (qMatch) {
        return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
      }
      const coordMatch = link.match(/([0-9.-]+),\s*([0-9.-]+)/);
      if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const calculateBounds = (): L.LatLngBounds | null => {
    const points: [number, number][] = [];
    
    // Add admin location once
    if (currentAdminLocation) {
      points.push([currentAdminLocation.latitude, currentAdminLocation.longitude]);
    }
    
    // Add all customer locations
    shipments.forEach((shipment) => {
      if (shipment.customer.lat && shipment.customer.lng) {
        points.push([shipment.customer.lat, shipment.customer.lng]);
      }
      if (shipment.acceptedRider) {
        points.push([shipment.acceptedRider.location.lat, shipment.acceptedRider.location.lng]);
      }
    });

    // Add all rider locations
    allRiders.forEach((rider) => {
      points.push([rider.lat, rider.lng]);
    });

    if (points.length > 0) {
      return L.latLngBounds(points);
    }
    return null;
  };

  const bounds = calculateBounds();
  const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'assigned': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'in_transit': return 'bg-green-100 text-green-800 border-green-300';
      case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Deliveries Map</h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentAdminMobile ? `Showing deliveries for: ${currentAdminMobile}` : 'Loading...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchAllShipments(currentAdminMobile)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => navigate('/shipment')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Portal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-100px)]">
        {/* Left Sidebar - Shipment List */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">Active Shipments ({shipments.length})</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-gray-500 mt-2">Loading shipments...</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500">No active shipments</p>
            </div>
          ) : (
            <div className="divide-y">
              {shipments.map((shipment) => (
                <div
                  key={shipment.id}
                  onClick={() => setSelectedShipment(shipment)}
                  className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedShipment?.id === shipment.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono text-gray-500">Shipment #{shipment.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">👤</span>
                      <span className="font-medium text-gray-900">{shipment.customer.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>📍</span>
                      <span className="truncate">{shipment.customer.landmark}</span>
                    </div>
                    
                    {shipment.acceptedRider && (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded px-2 py-1 mt-2">
                        <span>🏍️</span>
                        <span className="font-medium">{shipment.acceptedRider.name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t">
                      <span className="text-xs text-gray-500">
                        {new Date(shipment.createdAt).toLocaleTimeString()}
                      </span>
                      <span className="text-sm font-semibold text-green-600">₹{shipment.deliveryPrice}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right - Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater bounds={bounds} />

            {/* Admin/Shop Marker - Show only once for current admin */}
            {currentAdminLocation && (
              <Marker
                position={[currentAdminLocation.latitude, currentAdminLocation.longitude]}
                icon={shopIcon}
              >
                <Popup maxWidth={300}>
                  <div className="text-sm">
                    <div className="font-bold text-blue-600 mb-2">🏪 Your Shop</div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">{currentAdminLocation.address}</p>
                      <p className="text-xs"><strong>Mobile:</strong> {currentAdminMobile}</p>
                      <p className="text-xs"><strong>Active Deliveries:</strong> {shipments.length}</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* All Riders Markers - Show all live riders */}
            {allRiders.map((rider) => (
              <Marker
                key={rider.id}
                position={[rider.lat, rider.lng]}
                icon={bikeIcon}
              >
                <Popup maxWidth={300}>
                  <div className="text-sm">
                    <div className="font-bold text-orange-600 mb-2">🏍️ {rider.name}</div>
                    <div className="space-y-1">
                      <p className="text-xs"><strong>Status:</strong> {rider.status}</p>
                      {rider.phone && (
                        <p className="text-xs"><strong>Phone:</strong> {rider.phone}</p>
                      )}
                      {rider.activeShipmentId && (
                        <p className="text-xs text-blue-600">
                          <strong>Active Shipment:</strong> #{rider.activeShipmentId}
                        </p>
                      )}
                      {rider.updatedAt && (
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(rider.updatedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Render all shipments on map */}
            {shipments.map((shipment) => (
              <div key={shipment.id}>
                {/* Customer Marker */}
                {shipment.customer.lat && shipment.customer.lng && (
                  <Marker
                    position={[shipment.customer.lat, shipment.customer.lng]}
                    icon={customerIcon}
                  >
                    <Popup maxWidth={300}>
                      <div className="text-sm">
                        <div className="font-bold text-green-600 mb-2">📍 {shipment.customer.name}</div>
                        <div className="space-y-1">
                          <p className="text-xs"><strong>Mobile:</strong> {shipment.customer.mobile}</p>
                          <p className="text-xs"><strong>Address:</strong> {shipment.customer.address}</p>
                          <p className="text-xs"><strong>Landmark:</strong> {shipment.customer.landmark}</p>
                          <p className="text-xs font-semibold text-green-600 mt-2">💰 Fee: ₹{shipment.deliveryPrice}</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Rider Marker (for accepted shipment) */}
                {shipment.acceptedRider && (
                  <Marker
                    position={[shipment.acceptedRider.location.lat, shipment.acceptedRider.location.lng]}
                    icon={bikeIcon}
                  >
                    <Popup maxWidth={300}>
                      <div className="text-sm">
                        <div className="font-bold text-orange-600 mb-2">🏍️ {shipment.acceptedRider.name}</div>
                        <div className="space-y-1">
                          <p className="text-xs"><strong>Mobile:</strong> {shipment.acceptedRider.mobile}</p>
                          <p className="text-xs"><strong>Status:</strong> {shipment.status}</p>
                          <p className="text-xs"><strong>Shipment:</strong> #{shipment.id}</p>
                          <p className="text-xs text-gray-500 mt-2">📍 Location updating live...</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Route Lines */}
                {currentAdminLocation && shipment.acceptedRider && shipment.customer.lat && shipment.customer.lng && (
                  <>
                    {/* Shop to Rider */}
                    <Polyline
                      positions={[
                        [currentAdminLocation.latitude, currentAdminLocation.longitude],
                        [shipment.acceptedRider.location.lat, shipment.acceptedRider.location.lng],
                      ]}
                      color="#3B82F6"
                      weight={3}
                      opacity={0.7}
                      dashArray="10, 5"
                    />
                    {/* Rider to Customer */}
                    <Polyline
                      positions={[
                        [shipment.acceptedRider.location.lat, shipment.acceptedRider.location.lng],
                        [shipment.customer.lat, shipment.customer.lng],
                      ]}
                      color="#10B981"
                      weight={3}
                      opacity={0.7}
                      dashArray="10, 5"
                    />
                  </>
                )}
              </div>
            ))}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Map Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏪</span>
                <span className="text-gray-700">Shop Location</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🏍️</span>
                <span className="text-gray-700">Rider ({allRiders.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span className="text-gray-700">Customer</span>
              </div>
            </div>
          </div>

          {/* Auto-refresh indicator */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-sm px-3 py-2 z-[1000]">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-refreshing every 5s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AllShipmentsMap;

