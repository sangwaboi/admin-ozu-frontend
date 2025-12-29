import { useState, useEffect } from 'react';
import { MapPin, Package, Clock, IndianRupee } from 'lucide-react';

interface ShipmentOffer {
  id: string;
  adminLocation: {
    latitude: number;
    longitude: number;
    address: string;
    houseAddress?: string;
    landmark?: string;
  };
  customer: {
    name: string;
    mobile: string;
    address: string;
    landmark?: string;
    price: number;
  };
  distance: number; // Distance from rider in km
  createdAt: string;
}

interface AvailableShipmentsProps {
  riderId: string;
  onAccept: (shipment: ShipmentOffer) => void;
}

export function AvailableShipments({ riderId, onAccept }: AvailableShipmentsProps) {
  const [shipments, setShipments] = useState<ShipmentOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    fetchShipments();

    // Poll for new shipments every 5 seconds
    const interval = setInterval(fetchShipments, 5000);
    return () => clearInterval(interval);
  }, [riderId]);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('rider_token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/riders/${riderId}/available-shipments`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setShipments(data);
      }
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptShipment = async (shipment: ShipmentOffer) => {
    setAcceptingId(shipment.id);
    
    try {
      const token = localStorage.getItem('rider_token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/shipments/${shipment.id}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to accept shipment');
      }

      // Notify parent component
      onAccept(shipment);
    } catch (error) {
      console.error('Failed to accept shipment:', error);
      alert('Failed to accept delivery. It may have been taken by another rider.');
      fetchShipments(); // Refresh list
    } finally {
      setAcceptingId(null);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading && shipments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading deliveries...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Available Deliveries</h2>
        {loading && shipments.length > 0 && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            Refreshing...
          </div>
        )}
      </div>

      {shipments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-3" />
          <p className="text-gray-600 text-lg font-medium mb-1">No Deliveries Available</p>
          <p className="text-gray-500 text-sm">
            Waiting for new delivery requests nearby...
          </p>
          <div className="mt-4 text-xs text-gray-400">
            Auto-refreshing every 5 seconds
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map((shipment) => (
            <div
              key={shipment.id}
              className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">New Delivery Request</h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600 font-bold text-lg">
                    <IndianRupee className="h-4 w-4" />
                    <span>{shipment.customer.price}</span>
                  </div>
                </div>
              </div>

              {/* Distance & Time */}
              <div className="flex gap-4 mb-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">{shipment.distance.toFixed(1)} km away</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{getTimeAgo(shipment.createdAt)}</span>
                </div>
              </div>

              {/* Addresses */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">📍 PICKUP</p>
                  <p className="text-sm text-gray-800">
                    {shipment.adminLocation.houseAddress || shipment.adminLocation.address}
                  </p>
                  {shipment.adminLocation.landmark && (
                    <p className="text-xs text-gray-600">Near: {shipment.adminLocation.landmark}</p>
                  )}
                </div>
                <div className="border-t pt-2">
                  <p className="text-xs text-gray-500 font-medium mb-1">📍 DROP</p>
                  <p className="text-sm text-gray-800">{shipment.customer.address}</p>
                  {shipment.customer.landmark && (
                    <p className="text-xs text-gray-600">Near: {shipment.customer.landmark}</p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    Customer: {shipment.customer.name} ({shipment.customer.mobile})
                  </p>
                </div>
              </div>

              {/* Accept Button */}
              <button
                onClick={() => handleAcceptShipment(shipment)}
                disabled={acceptingId === shipment.id}
                className={`w-full py-3 rounded-lg font-medium transition ${
                  acceptingId === shipment.id
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
                }`}
              >
                {acceptingId === shipment.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Accepting...
                  </span>
                ) : (
                  'Accept Delivery'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

