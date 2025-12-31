import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationTracker } from './LocationTracker';
import { AvailableShipments } from './AvailableShipments';
import { ActiveDelivery } from './ActiveDelivery';
import { User, LogOut, Package } from 'lucide-react';

type RiderStatus = 'available' | 'on_delivery' | 'offline';

interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  status: RiderStatus;
  activeShipmentId?: string;
}

export default function RiderDashboard() {
  const navigate = useNavigate();
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [status, setStatus] = useState<RiderStatus>('offline');
  const [activeShipment, setActiveShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRiderProfile();
  }, []);

  const loadRiderProfile = async () => {
    const token = localStorage.getItem('rider_token');
    if (!token) {
      navigate('/rider/login');
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/riders/me`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setRider(data);
      setStatus(data.status || 'offline');

      // Load active shipment if rider is on delivery
      if (data.status === 'on_delivery' && data.activeShipmentId) {
        loadActiveShipment(data.activeShipmentId);
      }
    } catch (error) {
      console.error('Error loading rider profile:', error);
      localStorage.removeItem('rider_token');
      navigate('/rider/login');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveShipment = async (shipmentId: string) => {
    try {
      const token = localStorage.getItem('rider_token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/shipments/${shipmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActiveShipment(data);
      }
    } catch (error) {
      console.error('Error loading active shipment:', error);
    }
  };

  const handleStatusChange = async (newStatus: 'available' | 'offline') => {
    if (!rider) return;

    try {
      const token = localStorage.getItem('rider_token');
      
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/riders/${rider.id}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setStatus(newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rider_token');
    navigate('/rider/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!rider) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{rider.name}</h1>
                <p className="text-sm text-gray-600">{rider.phone}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Status Toggle */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Your Status
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStatusChange('available')}
              disabled={status === 'on_delivery'}
              className={`py-3 px-4 rounded-lg font-medium transition ${
                status === 'available'
                  ? 'bg-green-500 text-white shadow-lg scale-105'
                  : status === 'on_delivery'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🟢</span>
                <span>Available</span>
              </div>
            </button>
            <button
              onClick={() => handleStatusChange('offline')}
              disabled={status === 'on_delivery'}
              className={`py-3 px-4 rounded-lg font-medium transition ${
                status === 'offline'
                  ? 'bg-red-500 text-white shadow-lg scale-105'
                  : status === 'on_delivery'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">🔴</span>
                <span>Offline</span>
              </div>
            </button>
          </div>
          {status === 'on_delivery' && (
            <p className="text-sm text-yellow-600 mt-2 text-center">
              Complete current delivery to change status
            </p>
          )}
        </div>

        {/* Location Tracker */}
        <LocationTracker
          riderId={rider.id}
          isActive={status === 'available' || status === 'on_delivery'}
        />

        {/* Content based on status */}
        {status === 'on_delivery' && activeShipment ? (
          <ActiveDelivery 
            shipment={activeShipment}
            onComplete={() => {
              setStatus('available');
              setActiveShipment(null);
              loadRiderProfile();
            }}
          />
        ) : status === 'available' ? (
          <AvailableShipments
            riderId={rider.id}
            onAccept={(shipment) => {
              setStatus('on_delivery');
              setActiveShipment(shipment);
            }}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 mb-3">
              <Package className="h-16 w-16 mx-auto" />
            </div>
            <p className="text-gray-600 text-lg font-medium mb-2">You're Offline</p>
            <p className="text-gray-500 text-sm">
              Set your status to "Available" to start receiving delivery requests
            </p>
          </div>
        )}
      </main>
    </div>
  );
}


