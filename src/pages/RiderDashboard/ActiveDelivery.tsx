import { useState } from 'react';
import { MapPin, Phone, Navigation, CheckCircle, Package } from 'lucide-react';

interface ActiveDeliveryProps {
  shipment: any;
  onComplete: () => void;
}

export function ActiveDelivery({ shipment, onComplete }: ActiveDeliveryProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'pickup' | 'delivery'>('pickup');

  const handlePickup = async () => {
    try {
      const token = localStorage.getItem('rider_token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/shipments/${shipment.id}/pickup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setCurrentStep('delivery');
      } else {
        alert('Failed to mark as picked up');
      }
    } catch (error) {
      console.error('Error marking pickup:', error);
      alert('Failed to mark as picked up');
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this delivery as completed?')) return;

    setIsCompleting(true);
    try {
      const token = localStorage.getItem('rider_token');
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL}/shipments/${shipment.id}/complete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        onComplete();
      } else {
        alert('Failed to complete delivery');
      }
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert('Failed to complete delivery');
    } finally {
      setIsCompleting(false);
    }
  };

  const openNavigation = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Package className="h-6 w-6 text-blue-600" />
        Active Delivery
      </h2>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-2 ${currentStep === 'pickup' ? 'text-blue-600' : 'text-green-600'}`}>
            {currentStep === 'pickup' ? (
              <>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="font-bold">1</span>
                </div>
                <span className="font-medium">Go to Pickup</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-8 w-8 text-green-600" />
                <span className="font-medium">Picked Up</span>
              </>
            )}
          </div>
          <div className={`flex items-center gap-2 ${currentStep === 'delivery' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'delivery' ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <span className="font-bold">2</span>
            </div>
            <span className="font-medium">Deliver to Customer</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: currentStep === 'pickup' ? '50%' : '100%' }}
          ></div>
        </div>
      </div>

      {/* Pickup Location */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-800">Pickup Location</h3>
          </div>
          {currentStep === 'pickup' && (
            <span className="bg-orange-100 text-orange-600 text-xs font-medium px-2 py-1 rounded">
              Current Step
            </span>
          )}
        </div>
        <div className="ml-7">
          <p className="text-sm text-gray-800 mb-1">
            {shipment.adminLocation.houseAddress || shipment.adminLocation.address}
          </p>
          {shipment.adminLocation.landmark && (
            <p className="text-xs text-gray-600">Near: {shipment.adminLocation.landmark}</p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => openNavigation(
                shipment.adminLocation.latitude,
                shipment.adminLocation.longitude
              )}
              className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <Navigation className="h-4 w-4" />
              Navigate
            </button>
            <a
              href={`tel:${shipment.adminMobile}`}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Call Shop
            </a>
          </div>
          {currentStep === 'pickup' && (
            <button
              onClick={handlePickup}
              className="w-full mt-2 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600"
            >
              ✓ Mark as Picked Up
            </button>
          )}
        </div>
      </div>

      {/* Delivery Location */}
      <div className={`bg-white rounded-lg shadow-md p-4 ${currentStep === 'pickup' ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-800">Delivery Location</h3>
          </div>
          {currentStep === 'delivery' && (
            <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-1 rounded">
              Current Step
            </span>
          )}
        </div>
        <div className="ml-7">
          <p className="text-sm text-gray-800 mb-1">{shipment.customer.address}</p>
          {shipment.customer.landmark && (
            <p className="text-xs text-gray-600">Near: {shipment.customer.landmark}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            Customer: {shipment.customer.name}
          </p>
          <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-green-600">
            <span>₹{shipment.customer.price}</span>
          </div>
          {currentStep === 'delivery' && (
            <>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    // Parse location link
                    const match = shipment.customer.locationLink?.match(/([0-9.-]+),\s*([0-9.-]+)/);
                    if (match) {
                      openNavigation(parseFloat(match[1]), parseFloat(match[2]));
                    } else {
                      alert('Customer location not available');
                    }
                  }}
                  className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  Navigate
                </button>
                <a
                  href={`tel:${shipment.customer.mobile}`}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call Customer
                </a>
              </div>
              <button
                onClick={handleComplete}
                disabled={isCompleting}
                className={`w-full mt-2 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  isCompleting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isCompleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Complete Delivery
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


